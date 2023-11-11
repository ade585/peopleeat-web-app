import { useMutation, useQuery } from '@apollo/client';
import { Button, CircularProgress, Dialog, DialogContent, DialogTitle, Divider, Tab, Tabs } from '@mui/material';
import moment from 'moment';
import useTranslation from 'next-translate/useTranslation';
import Image from 'next/image';
import Link from 'next/link';
import { useEffect, useState, type ReactElement } from 'react';
import {
    CookBookingRequestAcceptDocument,
    CookBookingRequestDeclineDocument,
    CreateOneCookBookingRequestChatMessageDocument,
    FindOneCookBookingRequestDocument,
} from '../../../../data-source/generated/graphql';
import PEMealCard from '../../../cards/mealCard/PEMealCard';
import PEButton from '../../../standard/buttons/PEButton';
import { Icon } from '../../../standard/icon/Icon';
import PEIcon from '../../../standard/icon/PEIcon';
import PEIconButton from '../../../standard/iconButton/PEIconButton';
import PETextField from '../../../standard/textFields/PETextField';
import HStack from '../../../utility/hStack/HStack';
import Spacer from '../../../utility/spacer/Spacer';
import VStack from '../../../utility/vStack/VStack';
import CookProfilePageBookingsChatMessages from './CookProfilePageBookingsChatMessages';
import { cookProfileBookingTabTranslationKeys, cookProfileBookingTabTypes, type CookProfileBookingTabType } from './cookProfileBookingTabs';

export interface CookProfilePageBookingsTabProps {
    cookId: string;
    bookingRequestId: string;
    onClose: () => void;
}

export default function CookProfilePageBookingsTabDetail({
    cookId,
    bookingRequestId,
    onClose,
}: CookProfilePageBookingsTabProps): ReactElement {
    const { data, refetch } = useQuery(FindOneCookBookingRequestDocument, { variables: { cookId, bookingRequestId } });

    const { t: translateGlobalBookingRequest } = useTranslation('global-booking-request');
    const { t: commonTranslate } = useTranslation('common');
    const { t: cookProfileTranslate } = useTranslation('chef-profile');

    const [tab, setTab] = useState<CookProfileBookingTabType>('CHAT');
    const [newMessage, setNewMessage] = useState('');

    const [showAcceptDialog, setShowAcceptDialog] = useState(false);
    const [showDeclineDialog, setShowDeclineDialog] = useState(false);

    const [acceptBookingRequest, { loading: acceptLoading }] = useMutation(CookBookingRequestAcceptDocument);
    const [declineBookingRequest, { loading: declineLoading }] = useMutation(CookBookingRequestDeclineDocument);
    const [createMessage, { loading: createMessageLoading }] = useMutation(CreateOneCookBookingRequestChatMessageDocument);

    const bookingRequest = data?.cooks.bookingRequests.findOne;

    useEffect(() => {
        if (bookingRequest?.status === 'COMPLETED') setTab('RATING');
    }, [bookingRequest]);

    if (!bookingRequest) return <>{commonTranslate('loading')}</>;

    return (
        <>
            <HStack gap={16} style={{ alignItems: 'center' }} className="w-full">
                <Tabs value={tab}>
                    {cookProfileBookingTabTypes.map((tabType) => (
                        <Tab
                            key={tabType}
                            value={tabType}
                            onClick={(): void => setTab(tabType)}
                            style={{ textTransform: 'none' }}
                            label={translateGlobalBookingRequest(cookProfileBookingTabTranslationKeys[tabType])}
                        />
                    ))}
                </Tabs>

                <Spacer />

                {bookingRequest.user.firstName}

                {bookingRequest.user.profilePictureUrl && (
                    <Image
                        className="rounded-3"
                        style={{ width: '45px', height: '45px', objectFit: 'cover' }}
                        src={bookingRequest.user?.profilePictureUrl}
                        alt={'client image'}
                        width={45}
                        height={45}
                    />
                )}
                {!bookingRequest.user.profilePictureUrl && (
                    <div className="flex justify-center items-center w-11 h-11 bg-base rounded-3">
                        <PEIcon icon={Icon.profileLight} edgeLength={32} />
                    </div>
                )}

                <PEIconButton withoutShadow bg="white" icon={Icon.close} onClick={onClose} iconSize={24} />
            </HStack>

            <Divider flexItem />

            {tab === 'CHAT' && (
                <VStack style={{ width: '100%', height: '100%', justifyContent: 'space-between' }}>
                    <CookProfilePageBookingsChatMessages cookId={cookId} bookingRequestId={bookingRequest.bookingRequestId} />

                    {bookingRequest.status === 'OPEN' && (
                        <HStack gap={16} className="w-full">
                            {bookingRequest.cookAccepted === null && bookingRequest.userAccepted === true && (
                                <>
                                    <PEButton onClick={(): void => setShowDeclineDialog(true)} title="Ablehnen" size="s" type="secondary" />
                                    <PEButton onClick={(): void => setShowAcceptDialog(true)} title="Akzeptieren" size="s" />
                                </>
                            )}
                            {bookingRequest.cookAccepted === true && bookingRequest.userAccepted === null && (
                                <PEButton onClick={(): void => setShowDeclineDialog(true)} title="Ablehnen" size="s" />
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
                                    disabled={createMessageLoading}
                                    onClick={(): void =>
                                        void createMessage({
                                            variables: {
                                                cookId,
                                                bookingRequestId: bookingRequest.bookingRequestId,
                                                request: { message: newMessage },
                                            },
                                        }).then((result) => {
                                            if (!result.data?.cooks.bookingRequests.chatMessages.success) return;
                                            setNewMessage('');
                                        })
                                    }
                                >
                                    {cookProfileTranslate('booking-chat-send')}
                                </Button>
                            }
                        />
                    )}
                </VStack>
            )}

            {bookingRequest.configuredMenu && tab === 'MENU' && (
                <VStack gap={32}>
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
                </VStack>
            )}

            <Dialog open={acceptLoading}>
                <DialogTitle>{cookProfileTranslate('booking-loading-title-accept')}</DialogTitle>
                <DialogContent>
                    <VStack>
                        <CircularProgress />
                    </VStack>
                </DialogContent>
            </Dialog>

            <Dialog open={declineLoading}>
                <DialogTitle>{cookProfileTranslate('booking-loading-title-decline')}</DialogTitle>
                <DialogContent>
                    <VStack>
                        <CircularProgress />
                    </VStack>
                </DialogContent>
            </Dialog>

            <Dialog open={showDeclineDialog}>
                <DialogTitle>Bist du dir sicher dass du die Buchungsanfrage ablehnen möchtest?</DialogTitle>
                <DialogContent>
                    <VStack className="w-full" gap={32}>
                        <span>
                            Bitte beachte unsere Stornierungsbedingungen bevor du die Buchungsanfrage ablehnst. Diese findest du in unseren{' '}
                            <Link href="terms-and-conditions" target="_blank" className="text-orange">
                                AGB
                            </Link>
                            .
                        </span>
                        <HStack gap={16} className="w-full">
                            <PEButton title="Nein" type="secondary" onClick={(): void => setShowDeclineDialog(false)} />
                            <PEButton
                                title="Ja"
                                type="primary"
                                onClick={(): void =>
                                    void declineBookingRequest({
                                        variables: { cookId, bookingRequestId: bookingRequest.bookingRequestId },
                                    }).then((result) => {
                                        setShowDeclineDialog(false);
                                        if (result.data?.cooks.bookingRequests.success) void refetch();
                                    })
                                }
                            />
                        </HStack>
                    </VStack>
                </DialogContent>
            </Dialog>

            <Dialog open={showAcceptDialog}>
                <DialogTitle>Buchungsanfrage akzeptieren?</DialogTitle>
                <DialogContent>
                    <VStack className="w-full" gap={32}>
                        <span>Wir freuen uns dass du die Buchungsanfrage annehmen möchtest.</span>
                        <HStack gap={16} className="w-full">
                            <PEButton title="Nein" type="secondary" onClick={(): void => setShowAcceptDialog(false)} />
                            <PEButton
                                title="Ja"
                                type="primary"
                                onClick={(): void =>
                                    void acceptBookingRequest({
                                        variables: { cookId, bookingRequestId: bookingRequest.bookingRequestId },
                                    }).then((result) => {
                                        setShowAcceptDialog(false);
                                        if (result.data?.cooks.bookingRequests.success) void refetch();
                                    })
                                }
                            />
                        </HStack>
                    </VStack>
                </DialogContent>
            </Dialog>
        </>
    );
}
