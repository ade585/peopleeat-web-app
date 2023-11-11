import { useMutation, useQuery } from '@apollo/client';
import { Button, Divider, Tab, Tabs } from '@mui/material';
import moment from 'moment';
import useTranslation from 'next-translate/useTranslation';
import Image from 'next/image';
import { useState, type ReactElement } from 'react';
import {
    CreateOneUserBookingRequestChatMessageDocument,
    FindOneUserBookingRequestDocument,
    UserBookingRequestAcceptDocument,
    UserBookingRequestDeclineDocument,
    UserBookingRequestUpdatePriceDocument,
} from '../../../../data-source/generated/graphql';
import { formatPrice } from '../../../../shared-domain/formatPrice';
import PEMealCard from '../../../cards/mealCard/PEMealCard';
import PEButton from '../../../standard/buttons/PEButton';
import { Icon } from '../../../standard/icon/Icon';
import PEIcon from '../../../standard/icon/PEIcon';
import PEIconButton from '../../../standard/iconButton/PEIconButton';
import PETextField from '../../../standard/textFields/PETextField';
import HStack from '../../../utility/hStack/HStack';
import Spacer from '../../../utility/spacer/Spacer';
import VStack from '../../../utility/vStack/VStack';
import ProfilePageBookingsChatMessages from './ProfilePageBookingsChatMessages';
import { userProfileBookingTabTranslationKeys, userProfileBookingTabTypes, type UserProfileBookingTabType } from './userProfileBookingTabs';

export interface ProfilePageBookingsTabProps {
    userId: string;
    bookingRequestId: string;
    onClose: () => void;
}

export default function ProfilePageBookingsTabDetail({
    userId: userId,
    bookingRequestId,
    onClose,
}: ProfilePageBookingsTabProps): ReactElement {
    const { data, refetch } = useQuery(FindOneUserBookingRequestDocument, { variables: { userId, bookingRequestId } });

    const { t: translateGlobalBookingRequest } = useTranslation('global-booking-request');

    const [tab, setTab] = useState<UserProfileBookingTabType>('CHAT');
    const [newMessage, setNewMessage] = useState('');
    const [amount, setAmount] = useState(0);

    const [acceptBookingRequest] = useMutation(UserBookingRequestAcceptDocument);
    const [declineBookingRequest] = useMutation(UserBookingRequestDeclineDocument);
    const [updateBookingRequestPrice] = useMutation(UserBookingRequestUpdatePriceDocument);
    const [createMessage] = useMutation(CreateOneUserBookingRequestChatMessageDocument);

    const bookingRequest = data?.users.bookingRequests.findOne;

    // useEffect(() => {
    //     setAmount(bookingRequest?.price.amount ?? 0);
    //     if (bookingRequest?.status === 'COMPLETED') setTab('RATING');
    // }, [bookingRequest]);

    if (!bookingRequest) return <>{translateGlobalBookingRequest('loading')}</>;

    return (
        <>
            <HStack gap={16} style={{ alignItems: 'center' }} className="w-full">
                <Tabs value={tab}>
                    {userProfileBookingTabTypes.map((tabType) => (
                        <Tab
                            key={tabType}
                            value={tabType}
                            onClick={(): void => setTab(tabType)}
                            style={{ textTransform: 'none' }}
                            label={translateGlobalBookingRequest(userProfileBookingTabTranslationKeys[tabType])}
                        />
                    ))}
                </Tabs>

                <Spacer />

                {bookingRequest.cook.user.firstName}

                {bookingRequest.cook.user.profilePictureUrl && (
                    <Image
                        className="rounded-3"
                        style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                        src={bookingRequest.cook.user.profilePictureUrl}
                        alt={'client image'}
                        width={45}
                        height={45}
                    />
                )}

                {!bookingRequest.cook.user.profilePictureUrl && (
                    <div className="flex justify-center items-center w-11 h-11 bg-base rounded-3">
                        <PEIcon icon={Icon.profileLight} edgeLength={32} />
                    </div>
                )}

                <PEIconButton withoutShadow bg="white" icon={Icon.close} onClick={onClose} iconSize={24} />
            </HStack>

            <Divider flexItem />

            {tab === 'CHAT' && (
                <VStack style={{ width: '100%', height: '100%', justifyContent: 'space-between' }}>
                    <ProfilePageBookingsChatMessages userId={userId} bookingRequestId={bookingRequest.bookingRequestId} />

                    {bookingRequest.status === 'OPEN' && (
                        <HStack gap={16} className="w-full">
                            {bookingRequest.cookAccepted === true && bookingRequest.userAccepted === null && (
                                <>
                                    <PEButton
                                        onClick={(): void =>
                                            void declineBookingRequest({
                                                variables: { userId, bookingRequestId: bookingRequest.bookingRequestId },
                                            }).then((result) => result.data?.users.bookingRequests.success && void refetch())
                                        }
                                        title={translateGlobalBookingRequest('decline')}
                                        size="s"
                                        type="secondary"
                                    />
                                    <PEButton
                                        onClick={(): void =>
                                            void acceptBookingRequest({
                                                variables: { userId, bookingRequestId: bookingRequest.bookingRequestId },
                                            }).then((result) => result.data?.users.bookingRequests.success && void refetch())
                                        }
                                        title={translateGlobalBookingRequest('accept')}
                                        size="s"
                                    />
                                </>
                            )}
                            {bookingRequest.cookAccepted === null && bookingRequest.userAccepted === true && (
                                <PEButton
                                    onClick={(): void =>
                                        void declineBookingRequest({
                                            variables: { userId, bookingRequestId: bookingRequest.bookingRequestId },
                                        }).then((result) => result.data?.users.bookingRequests.success && void refetch())
                                    }
                                    title={translateGlobalBookingRequest('decline')}
                                    size="s"
                                />
                            )}
                        </HStack>
                    )}

                    {bookingRequest.status === 'PENDING' && (
                        <PETextField
                            value={newMessage}
                            onChange={setNewMessage}
                            type="text"
                            endContent={
                                <Button
                                    onClick={(): void =>
                                        void createMessage({
                                            variables: {
                                                userId,
                                                bookingRequestId: bookingRequest.bookingRequestId,
                                                request: { message: newMessage },
                                            },
                                        }).then((result) => {
                                            if (!result.data?.users.bookingRequests.chatMessages.success) return;
                                            setNewMessage('');
                                        })
                                    }
                                >
                                    {translateGlobalBookingRequest('send')}
                                </Button>
                            }
                        />
                    )}
                </VStack>
            )}

            {bookingRequest.configuredMenu && tab === 'MENU' && (
                <VStack gap={32} style={{ alignItems: 'flex-start', width: '100%' }}>
                    <span className="text-heading-m">{bookingRequest.configuredMenu.title}</span>
                    <VStack gap={32} style={{ flex: 1, alignItems: 'flex-start' }}>
                        {bookingRequest.configuredMenu.courses.map((course) => (
                            <VStack gap={16} key={course.index} className="w-full" style={{ alignItems: 'flex-start' }}>
                                <span className="text-heading-s">{course.title}</span>

                                <PEMealCard
                                    title={course.mealTitle}
                                    description={course.mealDescription}
                                    imageUrl={course.mealImageUrl ?? undefined}
                                    displayOnly
                                />
                            </VStack>
                        ))}
                    </VStack>
                </VStack>
            )}

            {tab === 'EVENT_DETAILS' && (
                <VStack className="box-border p-4 md:p-0" gap={32} style={{ maxHeight: 675, overflowY: 'auto' }}>
                    <VStack gap={16} style={{ alignItems: 'flex-start' }} className="w-full">
                        <span className="text-text-m-bold">{translateGlobalBookingRequest('participants-label')}</span>
                        <HStack gap={16} className="w-full">
                            <PEIcon icon={Icon.users} /> <span>{translateGlobalBookingRequest('adults-label')}</span> <Spacer />{' '}
                            {bookingRequest.adultParticipants}
                        </HStack>
                        <HStack gap={16} className="w-full">
                            <PEIcon icon={Icon.users} /> <span>{translateGlobalBookingRequest('children-label')}</span> <Spacer />{' '}
                            {bookingRequest.children}
                        </HStack>
                    </VStack>
                    <VStack gap={16} style={{ alignItems: 'flex-start' }} className="w-full">
                        <span className="text-text-m-bold">{translateGlobalBookingRequest('event-details-label')}</span>
                        <HStack gap={16}>
                            <PETextField value={moment(bookingRequest.dateTime).format('L')} onChange={(): void => undefined} type="text" />
                            <PETextField
                                value={moment(bookingRequest.dateTime).format('LT')}
                                onChange={(): void => undefined}
                                type="text"
                            />
                            <PETextField value={bookingRequest.occasion} onChange={(): void => undefined} type="text" />
                        </HStack>
                        <PETextField value={bookingRequest.location.text} onChange={(): void => undefined} type="text" />
                    </VStack>
                    <VStack gap={16} style={{ alignItems: 'flex-start' }} className="w-full">
                        <span className="text-text-m-bold">{translateGlobalBookingRequest('categories-label')}</span>
                        <PETextField value="" onChange={(): void => undefined} type="text" />
                    </VStack>
                    <VStack gap={16} style={{ alignItems: 'flex-start' }} className="w-full">
                        <span className="text-text-m-bold">{translateGlobalBookingRequest('kitchen-label')}</span>
                        <PETextField value="" onChange={(): void => undefined} type="text" />
                    </VStack>
                    <VStack gap={16} style={{ alignItems: 'flex-start' }} className="w-full">
                        <span className="text-text-m-bold">{translateGlobalBookingRequest('allergies-label')}</span>
                        <PETextField value="" onChange={(): void => undefined} type="text" />
                    </VStack>
                    <VStack gap={16} style={{ alignItems: 'flex-start' }} className="w-full">
                        <span className="text-text-m-bold">{translateGlobalBookingRequest('budget-label')}</span>
                        <PETextField
                            value={formatPrice({ amount, currencyCode: bookingRequest.price.currencyCode })}
                            endContent={<>{bookingRequest.price.currencyCode}</>}
                            onChange={(changedAmount): void => setAmount(Number(changedAmount))}
                            type="text"
                        />
                    </VStack>
                    {bookingRequest.price.amount !== amount && (
                        <PEButton
                            title={translateGlobalBookingRequest('budget-suggestion')}
                            onClick={(): void =>
                                void updateBookingRequestPrice({
                                    variables: {
                                        userId,
                                        bookingRequestId: bookingRequest.bookingRequestId,
                                        price: { amount, currencyCode: bookingRequest.price.currencyCode },
                                    },
                                }).then((result) => {
                                    if (!result.data?.users.bookingRequests.success) return;
                                    void refetch();
                                })
                            }
                        />
                    )}
                </VStack>
            )}

            {/* {tab === 'RATING' && <PEReviewCardUser />} */}
        </>
    );
}
