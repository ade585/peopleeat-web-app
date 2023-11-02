import { useMutation, useQuery } from '@apollo/client';
import { Button, CircularProgress, Dialog, DialogContent, DialogTitle, Divider } from '@mui/material';
import { Elements } from '@stripe/react-stripe-js';
import { loadStripe } from '@stripe/stripe-js';
import moment from 'moment';
import useTranslation from 'next-translate/useTranslation';
import Image from 'next/image';
import { useContext, useEffect, useState, type ReactElement } from 'react';
import {
    CreateOneUserBookingRequestDocument,
    GetProfileQueryDocument,
    type CookRank,
    type CreateBookingRequestRequest,
    type CurrencyCode,
    type Price,
} from '../../../data-source/generated/graphql';
import { type GoogleMapsPlacesResult } from '../../../data-source/searchAddress';
import useResponsive from '../../../hooks/useResponsive';
import { PublicMenuPageContext } from '../../../pages/menus/[menuId]';
import { type Allergy } from '../../../shared-domain/Allergy';
import { type Category } from '../../../shared-domain/Category';
import { type Kitchen } from '../../../shared-domain/Kitchen';
import { type Language } from '../../../shared-domain/Language';
import { type Location } from '../../../shared-domain/Location';
import { formatPrice } from '../../../shared-domain/formatPrice';
import { geoDistance } from '../../../utils/geoDistance';
import BookingRequestForm from '../../BookingRequestForm';
import SignInDialog from '../../SignInDialog';
import PEMealCard from '../../cards/mealCard/PEMealCard';
import PEMealCardMobile from '../../cards/mealCard/PEMealCardMobile';
import PEFooter from '../../footer/PEFooter';
import PEHeader from '../../header/PEHeader';
import PEButton from '../../standard/buttons/PEButton';
import PECarousel from '../../standard/carousel/PECarousel';
import { Icon } from '../../standard/icon/Icon';
import PEIcon from '../../standard/icon/PEIcon';
import HStack from '../../utility/hStack/HStack';
import Spacer from '../../utility/spacer/Spacer';
import VStack from '../../utility/vStack/VStack';
import { calculateMenuPrice } from '../cookProfile/menusTab/createMenu/createMenuStep3/ChefProfilePageCreateMenuStep3';
import Payment from '../menuBookingRequest/Payment';

interface MenuCourse {
    index: number;
    courseId: string;
    title: string;
    mealOptions: {
        index: number;
        meal: {
            mealId: string;
            title: string;
            description: string;
            imageUrl?: string | null;
        };
    }[];
}

export interface PublicMenuPageProps {
    searchParameters: {
        location: {
            address: string;
            latitude: number;
            longitude: number;
        };
        adults: number;
        children: number;
        date: string;
    };
    allergies: Allergy[];
    publicMenu: {
        menuId: string;
        title: string;
        description: string;
        pricePerAdult: number;
        pricePerChild?: number;
        preparationTime: number;
        basePrice: number;
        basePriceCustomers: number;
        currencyCode: CurrencyCode;
        greetingFromKitchen?: string;
        kitchen?: Kitchen;
        categories: Category[];
        imageUrls: string[];
        createdAt: Date;
        courses: MenuCourse[];
        cook: {
            cookId: string;
            rank: CookRank;
            city: string;
            biography: string;
            maximumParticipants?: number | null;
            maximumPrice?: number | null;
            maximumTravelDistance?: number | null;
            minimumParticipants?: number | null;
            minimumPrice?: number | null;
            travelExpenses: number;
            user: { firstName: string; profilePictureUrl?: string };
            location: Location;
            languages: Language[];
        };
    };
    stripePublishableKey: string;
}

export interface Meal {
    mealId: string;
    title: string;
    description: string;
    imageUrl?: string | null;
}

// eslint-disable-next-line max-statements
export default function PublicMenuPage({
    publicMenu,
    searchParameters,
    allergies,
    stripePublishableKey,
}: PublicMenuPageProps): ReactElement {
    const { isMobile } = useResponsive();

    const { signedInUser, setSignedInUser } = useContext(PublicMenuPageContext);

    const { t } = useTranslation('common');

    const [showSignInDialog, setShowSignInDialog] = useState(false);

    const [address, setAddress] = useState<string>(searchParameters.location.address);
    const [selectedLocation, setSelectedLocation] = useState<Location | undefined>(undefined);
    const [addressSearchResults, setAddressSearchResults] = useState<GoogleMapsPlacesResult[]>([]);

    const [adults, setAdults] = useState(searchParameters.adults);
    const [children, setChildren] = useState(searchParameters.children);
    const [dateTime, setDateTime] = useState(moment(searchParameters.date).set('hours', 12).set('minutes', 0));

    const moreThanTwoWeeksInTheFuture = dateTime.diff(moment(), 'days');

    const [occasion, setOccasion] = useState('');
    const [message, setMessage] = useState<string>('');

    const [selectedAllergies, setSelectedAllergies] = useState<Allergy[]>([]);

    const { refetch } = useQuery(GetProfileQueryDocument);

    const [areMealsOnMenuSelected, setAreMealsOnMenuSelected] = useState(false);

    const [stripeClientSecret, setStripeClientSecret] = useState<string | undefined>();

    const [completionState, setCompletionState] = useState<undefined | 'SUCCESSFUL' | 'FAILED'>(undefined);
    const [loading, setLoading] = useState(false);
    const [courseSelections, setCourseSelections] = useState<Map<{ courseId: string; title: string; index: number }, Meal | undefined>>(
        new Map(publicMenu.courses.map((course) => [course, course.mealOptions[0]?.meal ?? undefined])),
    );

    const courseSelectionsArray = Array.from(courseSelections.entries());
    courseSelectionsArray.sort(([courseA], [courseB]) => courseA.index - courseB.index);

    const [courses, setCourses] = useState<MenuCourse[]>([]);

    useEffect(() => {
        const sortedCourses = publicMenu.courses;
        sortedCourses.sort((courseA, courseB) => courseA.index - courseB.index);

        setCourses(sortedCourses);
    }, [publicMenu]);

    const disabled = Array.from(courseSelections.entries()).findIndex(([_courseId, mealId]) => mealId === undefined) !== -1;

    const distance: number | undefined =
        selectedLocation && geoDistance({ location1: selectedLocation, location2: publicMenu.cook.location });

    const isOutOfCookTravelRadius =
        !!publicMenu.cook.maximumTravelDistance && distance !== undefined && location && distance > publicMenu.cook.maximumTravelDistance;

    const travelExpenses: number | undefined = distance && distance * publicMenu.cook.travelExpenses;

    const menuPrice = calculateMenuPrice(
        adults,
        children,
        publicMenu.basePrice,
        publicMenu.basePriceCustomers,
        publicMenu.pricePerAdult,
        publicMenu.pricePerChild,
    );

    const customerFee = menuPrice * 0.04;
    const stripeTransactionPrice = menuPrice + (travelExpenses ?? 0) + customerFee;
    const finalPrice = (stripeTransactionPrice + 25) / (1 - 0.015);
    const stripeFee = finalPrice - stripeTransactionPrice;
    const serviceFee = stripeFee + customerFee;

    const lineItems: { title: string; price: Price }[] = [];

    lineItems.push({
        title: 'Menüpreis',
        price: { amount: menuPrice, currencyCode: 'EUR' },
    });

    if (travelExpenses && !isOutOfCookTravelRadius) {
        lineItems.push({
            title: 'Reisekosten',
            price: { amount: travelExpenses, currencyCode: 'EUR' },
        });
    }

    lineItems.push({
        title: 'Service Gebühren',
        price: { amount: serviceFee, currencyCode: 'EUR' },
    });

    const costs: { lineItems: { title: string; price: Price }[]; total: Price } = {
        lineItems: lineItems,
        total: {
            amount: finalPrice,
            currencyCode: 'EUR',
        },
    };

    const [createMenuBookingRequest] = useMutation(CreateOneUserBookingRequestDocument);
    const [bookingRequestId, setBookingRequestId] = useState<string | undefined>(undefined);

    function onBook(): void {
        const menuBookingRequest: CreateBookingRequestRequest = {
            adultParticipants: adults,
            children,
            dateTime: dateTime.toDate(),
            duration: 120,
            location: {
                latitude: selectedLocation?.latitude ?? 0,
                longitude: selectedLocation?.latitude ?? 0,
                text: address,
            },
            occasion,
            price: {
                // TODO: remove this from menu booking params. Should be calculated on the server side
                amount: finalPrice,
                currencyCode: 'EUR',
            },
            // allergyIds: selectedAllergies.map(({ allergyId }) => allergyId),
            message,
            cookId: publicMenu.cook.cookId,
            preparationTime: 120,
            configuredMenu: {
                menuId: publicMenu.menuId,
                courses: Array.from(courseSelections.entries()).map(([{ courseId }, meal]) => ({ courseId, mealId: meal!.mealId })),
            },
        };

        setLoading(true);

        void createMenuBookingRequest({
            variables: {
                userId: signedInUser?.userId ?? '',
                request: menuBookingRequest,
            },
        })
            .then(({ data }) => {
                if (data?.users.bookingRequests.createOne.success) {
                    setCompletionState('SUCCESSFUL');
                    setStripeClientSecret(data.users.bookingRequests.createOne.clientSecret);
                    setBookingRequestId(data.users.bookingRequests.createOne.bookingRequestId);
                } else setCompletionState('FAILED');
            })
            .catch(() => setCompletionState('FAILED'))
            .finally(() => setLoading(false));
    }

    return (
        <VStack gap={82} className="w-full h-full overflow-x-hidden">
            <PEHeader signedInUser={signedInUser} />
            <VStack className="relative lg:w-[calc(100%-32px)] w-[calc(100%-64px)] max-w-screen-xl mx-8 lg:mx-4" gap={32}>
                {publicMenu && (
                    <>
                        <HStack
                            className="w-full bg-white shadow-primary box-border p-8 rounded-4"
                            gap={16}
                            style={{ flexDirection: isMobile ? 'column' : 'row' }}
                        >
                            <div className="flex justify-center items-center rounded-3  overflow-hidden w-[220px] min-w-[220px] max-w-[220px] h-[220px] max-h-[220px] bg-base">
                                {publicMenu.imageUrls.length < 1 && <PEIcon icon={Icon.food} edgeLength={52} />}

                                {publicMenu.imageUrls.length === 1 && (
                                    <Image
                                        draggable={false}
                                        style={{ width: '100%', objectPosition: 'center', objectFit: 'cover' }}
                                        src={publicMenu.imageUrls[0] as string}
                                        alt={'Menu image'}
                                        width={220}
                                        height={220}
                                    />
                                )}

                                {publicMenu.imageUrls.length > 1 && !isMobile && (
                                    <PECarousel
                                        images={publicMenu.imageUrls.map((picture, index) => (
                                            <Image
                                                draggable={false}
                                                key={index}
                                                style={{ width: '100%', objectPosition: 'center', objectFit: 'cover' }}
                                                src={picture}
                                                alt={`Menu image ${index + 1}`}
                                                width={220}
                                                height={220}
                                            />
                                        ))}
                                    />
                                )}

                                {publicMenu.imageUrls.length > 1 && isMobile && (
                                    <Image
                                        draggable={false}
                                        style={{ width: '100%', objectPosition: 'center', objectFit: 'cover' }}
                                        src={publicMenu.imageUrls[0] as string}
                                        alt={'Menu image'}
                                        width={220}
                                        height={220}
                                    />
                                )}
                            </div>

                            {publicMenu.imageUrls.length > 1 && isMobile && (
                                <div className="flex overflow-x-auto  gap-3 mt-2" style={{ overflow: 'scroll' }}>
                                    {publicMenu.imageUrls.slice(1).map((imageUrl, index) => (
                                        <div key={index} className="flex-none rounded-3 w-28">
                                            <Image
                                                draggable={false}
                                                style={{ width: '100%', objectPosition: 'center', objectFit: 'fill', borderRadius: '12px' }}
                                                src={imageUrl}
                                                alt={'Menu image'}
                                                width={100}
                                                height={100}
                                            />
                                        </div>
                                    ))}
                                </div>
                            )}

                            <VStack gap={16} style={{ alignItems: 'flex-start' }}>
                                <VStack gap={0} style={{ alignItems: 'flex-start' }}>
                                    <p style={{ lineHeight: 0, textAlign: 'start' }} className="text-heading-m">
                                        {publicMenu.title}
                                    </p>
                                    <p style={{ lineHeight: 0, textAlign: 'start' }} className="text-orange">
                                        {(menuPrice / 100 / (adults + children)).toFixed(2)} EUR pro Person
                                    </p>
                                    <p style={{ lineHeight: 0 }} className="text-gray">
                                        (Bei einer Anzahl von {adults + children} Personen)
                                    </p>

                                    <HStack gap={8} className="w-full">
                                        {publicMenu.cook.user.profilePictureUrl && (
                                            <Image
                                                width={48}
                                                height={48}
                                                src={publicMenu.cook.user.profilePictureUrl}
                                                alt={'Profile picture of the chef owning the menu'}
                                                className="object-cover"
                                                style={{ borderRadius: '50%' }}
                                            />
                                        )}

                                        {!publicMenu.cook.user.profilePictureUrl && <PEIcon edgeLength={48} icon={Icon.profileLight} />}

                                        <VStack style={{ alignItems: 'flex-start' }}>
                                            <span className="text-preBlack">{publicMenu.cook.user.firstName}</span>
                                            <HStack gap={4}>
                                                <PEIcon icon={Icon.markerPin} />
                                                <span className="text-preBlack">{publicMenu.cook.city}</span>
                                            </HStack>
                                        </VStack>

                                        <Spacer />
                                    </HStack>

                                    {publicMenu.description && (
                                        <VStack style={{ alignItems: 'flex-start' }}>
                                            <p style={{ lineHeight: 0 }} className="text-gray">
                                                Menübeschreibung
                                            </p>
                                            <span>{publicMenu.description}</span>
                                        </VStack>
                                    )}
                                </VStack>

                                {publicMenu.categories.map((category) => (
                                    <div key={category.categoryId}>{category.title}</div>
                                ))}

                                <HStack>
                                    {publicMenu.kitchen && (
                                        <VStack style={{ alignItems: 'flex-start' }}>
                                            <p style={{ lineHeight: 0 }} className="text-gray">
                                                Küche
                                            </p>
                                            <HStack gap={4}>
                                                {Boolean(publicMenu.kitchen) && <PEIcon icon={Icon.dishes} />}
                                                <span className="text-orange">{publicMenu.kitchen.title}</span>
                                            </HStack>
                                        </VStack>
                                    )}
                                </HStack>

                                {/* {publicMenu.cook.languages?.length > 0 && (
                                    <HStack gap={16}>
                                        <PEIcon icon={Icon.messageChat} />
                                        <span>{publicMenu.cook.languages.map(({ title }) => title).join(', ')}</span>
                                    </HStack>
                                )} */}
                            </VStack>

                            <Spacer />
                        </HStack>

                        {/* <Divider flexItem className="py-3" /> */}

                        <HStack
                            gap={32}
                            className="w-full"
                            style={{ minWidth: '500px', flexWrap: 'wrap', justifyContent: 'space-between' }}
                        >
                            <VStack gap={32} style={{ flex: isMobile ? 'none' : 1 }}>
                                {publicMenu.greetingFromKitchen && (
                                    <VStack gap={32} style={{ width: isMobile ? '93vw' : '100%', alignItems: 'flex-start' }}>
                                        <HStack gap={16}>
                                            <span className="text-heading-m">Gruß aus der Küche</span>
                                            <Spacer />
                                        </HStack>
                                        <span style={{ color: 'gray' }}>
                                            Der Gruß aus der Küche regt den Apetit an und steigert die Vorfreude auf das Menü.
                                        </span>
                                    </VStack>
                                )}
                                {courses.map((course) => (
                                    <VStack
                                        key={course.courseId}
                                        style={{ width: isMobile ? '93vw' : '100%', alignItems: 'flex-start' }}
                                        gap={32}
                                    >
                                        <HStack className="w-full">
                                            <span className="text-heading-m">{course.title}</span>
                                            <Spacer />
                                        </HStack>

                                        <HStack
                                            gap={isMobile ? 16 : 24}
                                            style={{ justifyContent: 'flex-start', width: '100%', maxWidth: 1000, flexWrap: 'wrap' }}
                                        >
                                            {isMobile &&
                                                course.mealOptions.map((mealOption) => (
                                                    <PEMealCardMobile
                                                        key={mealOption.index}
                                                        title={mealOption.meal.title}
                                                        description={mealOption.meal.description}
                                                        imageUrl={mealOption.meal.imageUrl ?? undefined}
                                                        active={courseSelections.get(course)?.mealId === mealOption.meal.mealId}
                                                        onClick={(): void =>
                                                            setCourseSelections(new Map(courseSelections.set(course, mealOption.meal)))
                                                        }
                                                    />
                                                ))}

                                            {!isMobile &&
                                                course.mealOptions.map((mealOption) => (
                                                    <PEMealCard
                                                        key={mealOption.index}
                                                        title={mealOption.meal.title}
                                                        description={mealOption.meal.description}
                                                        imageUrl={mealOption.meal.imageUrl ?? undefined}
                                                        active={courseSelections.get(course)?.mealId === mealOption.meal.mealId}
                                                        onClick={(): void =>
                                                            setCourseSelections(new Map(courseSelections.set(course, mealOption.meal)))
                                                        }
                                                    />
                                                ))}
                                        </HStack>
                                    </VStack>
                                ))}
                            </VStack>

                            {!isMobile && (
                                <BookingRequestForm
                                    signedInUser={signedInUser}
                                    externalDisabled={disabled}
                                    allergies={allergies}
                                    costs={costs}
                                    onComplete={(): void => onBook()}
                                    address={address}
                                    setAddress={setAddress}
                                    location={selectedLocation}
                                    setLocation={setSelectedLocation}
                                    cookMaximumTravelDistance={publicMenu.cook.maximumTravelDistance ?? undefined}
                                    cookLocation={publicMenu.cook.location}
                                    addressSearchResults={addressSearchResults}
                                    setAddressSearchResults={setAddressSearchResults}
                                    adults={adults}
                                    setAdults={setAdults}
                                    // eslint-disable-next-line react/no-children-prop
                                    children={children}
                                    setChildren={setChildren}
                                    dateTime={dateTime}
                                    setDateTime={setDateTime}
                                    occasion={occasion}
                                    setOccasion={setOccasion}
                                    message={message}
                                    setMessage={setMessage}
                                    selectedAllergies={selectedAllergies}
                                    setSelectedAllergies={setSelectedAllergies}
                                    onShowSignInDialog={(): void => setShowSignInDialog(!showSignInDialog)}
                                />
                            )}
                        </HStack>

                        {isMobile && <PEButton title="Weiter" onClick={(): void => setAreMealsOnMenuSelected(true)} />}

                        {isMobile && areMealsOnMenuSelected && (
                            <div
                                className="fixed inset-0 z-50 bg-white pt-[80px] flex flex-col justify-center items-center"
                                style={{ overflowY: 'auto' }}
                            >
                                <Button
                                    onClick={(): void => setAreMealsOnMenuSelected(false)}
                                    style={{ position: 'absolute', top: 8, left: 16 }}
                                >
                                    <PEIcon icon={Icon.arrowPrev} edgeLength={20} /> Back
                                </Button>

                                <BookingRequestForm
                                    signedInUser={signedInUser}
                                    externalDisabled={disabled}
                                    allergies={allergies}
                                    costs={costs}
                                    onComplete={(): void => onBook()}
                                    address={address}
                                    setAddress={setAddress}
                                    location={selectedLocation}
                                    setLocation={setSelectedLocation}
                                    cookMaximumTravelDistance={publicMenu.cook.maximumTravelDistance ?? undefined}
                                    cookLocation={publicMenu.cook.location}
                                    addressSearchResults={addressSearchResults}
                                    setAddressSearchResults={setAddressSearchResults}
                                    adults={adults}
                                    setAdults={setAdults}
                                    // eslint-disable-next-line react/no-children-prop
                                    children={children}
                                    setChildren={setChildren}
                                    dateTime={dateTime}
                                    setDateTime={setDateTime}
                                    occasion={occasion}
                                    setOccasion={setOccasion}
                                    message={message}
                                    setMessage={setMessage}
                                    selectedAllergies={selectedAllergies}
                                    setSelectedAllergies={setSelectedAllergies}
                                    onShowSignInDialog={(): void => setShowSignInDialog(!showSignInDialog)}
                                />
                            </div>
                        )}
                    </>
                )}
            </VStack>

            {showSignInDialog && (
                <Dialog open maxWidth="md">
                    <DialogTitle>{'Anmelden'}</DialogTitle>
                    <DialogContent>
                        <SignInDialog
                            onSuccess={(): void => {
                                refetch()
                                    .then((data) => {
                                        setShowSignInDialog(false);
                                        if (data.data.users.me) {
                                            setSignedInUser({
                                                userId: data.data.users.me.userId,
                                                firstName: data.data.users.me.firstName,
                                                isCook: data.data.users.me.isCook,
                                                isAdmin: data.data.users.me.isAdmin,
                                            });
                                        }
                                    })
                                    .catch((e) => console.error(e));
                            }}
                            onFail={(): void => undefined}
                        />
                    </DialogContent>
                </Dialog>
            )}

            {completionState === 'SUCCESSFUL' && stripeClientSecret && (
                <Dialog open maxWidth="md">
                    <DialogTitle>Zahlungsmittel hinterlegen</DialogTitle>

                    <Elements stripe={loadStripe(`${stripePublishableKey}`)} options={{ clientSecret: stripeClientSecret }}>
                        <Payment userId={signedInUser!.userId} bookingRequestId={bookingRequestId!}>
                            {costs && (
                                <VStack gap={16} style={{ width: '100%', flex: 1 }}>
                                    <h3 style={{ lineHeight: 0 }}>{publicMenu.title}</h3>

                                    {courseSelectionsArray.map(([course, meal]) => (
                                        <VStack key={course.courseId}>
                                            <b>{course.title}</b>
                                            <div>{meal?.title}</div>
                                        </VStack>
                                    ))}

                                    <Spacer />

                                    <Divider flexItem />

                                    {costs.lineItems.map((lineItem, index) => (
                                        <HStack className="w-full" key={index}>
                                            <span>{lineItem.title}</span>
                                            <Spacer />
                                            <span>{formatPrice(lineItem.price)}</span>
                                        </HStack>
                                    ))}

                                    <HStack className="w-full">
                                        <span>
                                            <b>Gesamtsumme</b>
                                        </span>
                                        <Spacer />
                                        <span>
                                            <b>{formatPrice(costs.total)}</b>
                                        </span>
                                    </HStack>

                                    {moreThanTwoWeeksInTheFuture <= 14 && (
                                        <div className="text-text-sm" style={{ color: 'gray' }}>
                                            Der Gesamtbetrag wird erst dann eingezogen wenn der Koch die Anfrage akzeptiert hat.
                                        </div>
                                    )}
                                    {moreThanTwoWeeksInTheFuture > 14 && (
                                        <div className="text-text-sm" style={{ color: 'gray' }}>
                                            Nachdem der Koch die Anfrage akzeptiert hat, wird die Gesamtsumme 2 Wochen vor dem Event
                                            eingezogen (zuvor wird eine Ankündigungsmail verschickt).
                                        </div>
                                    )}
                                </VStack>
                            )}
                        </Payment>
                    </Elements>
                </Dialog>
            )}

            {loading && (
                <Dialog open>
                    <DialogContent>
                        <CircularProgress />
                    </DialogContent>
                </Dialog>
            )}

            {completionState === 'FAILED' && (
                <Dialog open>
                    <DialogContent>{t('error')}</DialogContent>
                </Dialog>
            )}

            <PEFooter />
        </VStack>
    );
}
