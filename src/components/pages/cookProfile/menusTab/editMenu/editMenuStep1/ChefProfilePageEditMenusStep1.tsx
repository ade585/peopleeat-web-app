import { useMutation, useQuery } from '@apollo/client';
import { Alert, Dialog, DialogContent, Divider, Snackbar } from '@mui/material';
import useTranslation from 'next-translate/useTranslation';
import { useEffect, useState, type ReactElement } from 'react';
import {
    DeleteOneCookMenuDocument,
    GetCreateMenuPageDataDocument,
    UpdateCookMenuDescriptionDocument,
    UpdateCookMenuIsVisibleDocument,
    UpdateCookMenuKitchenIdDocument,
    UpdateCookMenuPreparationTimeDocument,
    UpdateCookMenuTitleDocument,
} from '../../../../../../data-source/generated/graphql';
import { type Category } from '../../../../../../shared-domain/Category';
import { type Kitchen } from '../../../../../../shared-domain/Kitchen';
import PEButton from '../../../../../standard/buttons/PEButton';
import PECheckbox from '../../../../../standard/checkbox/PECheckbox';
import PEDropdown from '../../../../../standard/dropdown/PEDropdown';
import PESingleSelectDropdown from '../../../../../standard/dropdown/PESingleSelectDropdown';
import { Icon } from '../../../../../standard/icon/Icon';
import PEIconButton from '../../../../../standard/iconButton/PEIconButton';
import PEMultiLineTextField from '../../../../../standard/textFields/PEMultiLineTextField';
import PENumberTextField from '../../../../../standard/textFields/PENumberTextField';
import PETextField from '../../../../../standard/textFields/PETextField';
import HStack from '../../../../../utility/hStack/HStack';
import VStack from '../../../../../utility/vStack/VStack';
import { type MenuEntity } from '../../ChefProfilePageMenusTab';

export interface ChefProfilePageEditMenusStep1Props {
    menu: MenuEntity;
    cookId: string;
    onChangesApplied: () => void;
    onDelete: () => void;
}

// eslint-disable-next-line max-statements
export default function ChefProfilePageEditMenusStep1({
    cookId,
    menu,
    onChangesApplied,
    onDelete,
}: ChefProfilePageEditMenusStep1Props): ReactElement {
    const { t } = useTranslation('chef-profile');
    const { t: commonTranslations } = useTranslation('common');
    const [title, setTitle] = useState(menu.title);
    const [description, setDescription] = useState(menu.description);

    const [selectedKitchen, setSelectedKitchen] = useState<Kitchen | undefined>(menu.kitchen ?? undefined);
    const [selectedCategories, setSelectedCategories] = useState<Category[]>(menu.categories);

    const [preparationTime, setPreparationTime] = useState(menu.preparationTime);
    const [isVisible, setIsVisible] = useState(menu.isVisible);

    const [updateTitle] = useMutation(UpdateCookMenuTitleDocument, { variables: { cookId, menuId: menu.menuId, title } });
    const [updateDescription] = useMutation(UpdateCookMenuDescriptionDocument, { variables: { cookId, menuId: menu.menuId, description } });
    const [updateKitchenId] = useMutation(UpdateCookMenuKitchenIdDocument, {
        variables: { cookId, menuId: menu.menuId, kitchenId: selectedKitchen?.kitchenId },
    });
    const [updateIsVisible] = useMutation(UpdateCookMenuIsVisibleDocument, { variables: { cookId, menuId: menu.menuId, isVisible } });
    const [updatePreparationTime] = useMutation(UpdateCookMenuPreparationTimeDocument, {
        variables: { cookId, menuId: menu.menuId, preparationTime },
    });

    const [deleteMenu] = useMutation(DeleteOneCookMenuDocument, { variables: { cookId, menuId: menu.menuId } });
    const [showDeleteDialog, setShowDeleteDialog] = useState(false);

    const { data } = useQuery(GetCreateMenuPageDataDocument);

    const kitchens = data?.kitchens.findAll ?? [];
    const categories = data?.categories.findAll ?? [];

    const [changesHaveBeenSaved, setChangesHaveBeenSaved] = useState(false);

    function handleSaveUpdates(): void {
        if (menu.title !== title) {
            void updateTitle()
                .then((result) => result.data?.cooks.menus.success && void onChangesApplied())
                .catch((e) => console.error(e));
        }

        if (menu.description !== description) {
            void updateDescription()
                .then((result) => result.data?.cooks.menus.success && void onChangesApplied())
                .catch((e) => console.error(e));
        }

        if (menu.kitchen?.kitchenId !== selectedKitchen?.kitchenId) {
            void updateKitchenId()
                .then((result) => result.data?.cooks.menus.success && void onChangesApplied())
                .catch((e) => console.error(e));
        }

        if (menu.isVisible !== isVisible) {
            void updateIsVisible()
                .then((result) => result.data?.cooks.menus.success && void onChangesApplied())
                .catch((e) => console.error(e));
        }

        if (menu.preparationTime !== preparationTime) {
            void updatePreparationTime()
                .then((result) => result.data?.cooks.menus.success && void onChangesApplied())
                .catch((e) => console.error(e));
        }

        setChangesHaveBeenSaved(true);
        setTimeout(() => setChangesHaveBeenSaved(false), 2000);
    }

    useEffect(() => {
        setTitle(menu.title);
        setDescription(menu.description);
        setSelectedKitchen(menu.kitchen ?? undefined);
        setSelectedCategories(menu.categories);
        setPreparationTime(menu.preparationTime);
        setIsVisible(menu.isVisible);
    }, [menu]);

    return (
        <VStack className="w-full" gap={32} style={{ alignItems: 'flex-start', justifyContent: 'flex-start' }}>
            <VStack className="w-full">
                <p className="w-full mb-4 text-text-m-bold my-0">{t('create-menu-title')}</p>
                <PETextField type={'text'} value={title} onChange={setTitle} />
            </VStack>

            <VStack style={{ alignItems: 'flex-start' }} className="w-full">
                <p className="text-text-m-bold">{t('create-menu-description')}</p>
                <PEMultiLineTextField value={description} onChange={setDescription} />
            </VStack>

            <Divider className="w-full" />

            <PEDropdown
                title={t('create-menu-categories')}
                defaultExpanded
                options={categories}
                getOptionLabel={(category): string => category.title}
                optionsEqual={(categoryA, categoryB): boolean => categoryA.categoryId === categoryB.categoryId}
                setSelectedOptions={setSelectedCategories}
                showSelectedCount
                selectedOptions={selectedCategories}
            />

            <PESingleSelectDropdown
                title={t('create-menu-kitchen')}
                options={kitchens}
                getOptionLabel={(kitchen): string => kitchen?.title ?? ''}
                optionsEqual={(kitchenA, kitchenB): boolean => kitchenA?.kitchenId === kitchenB?.kitchenId}
                selectedOption={selectedKitchen}
                setSelectedOption={setSelectedKitchen}
                defaultExpanded
            />

            <Divider className="w-full" />

            <VStack className="w-full" style={{ alignItems: 'flex-start' }}>
                <p className="text-text-m-bold">{t('create-menu-preparation-time')}</p>
                <PENumberTextField
                    min={0}
                    step={15}
                    max={240}
                    onChange={setPreparationTime}
                    value={preparationTime}
                    endContent={<>min</>}
                />
            </VStack>

            <HStack style={{ alignItems: 'center' }}>
                <PECheckbox checked={isVisible} onCheckedChange={(): void => setIsVisible(!isVisible)} />
                <p className="text-text-m-bold">{isVisible ? t('menu-detail-is-visible-label') : t('menu-detail-is-not-visible-label')}</p>
            </HStack>

            <HStack className="w-full" gap={16} style={{ marginTop: 32 }}>
                <PEButton title={commonTranslations('delete')} type="secondary" onClick={(): void => setShowDeleteDialog(true)} />
                <PEButton
                    title={commonTranslations('save')}
                    onClick={handleSaveUpdates}
                    disabled={
                        menu.title === title &&
                        menu.description === description &&
                        menu.kitchen?.kitchenId === selectedKitchen?.kitchenId &&
                        menu.preparationTime === preparationTime &&
                        menu.isVisible === isVisible
                    }
                />
            </HStack>

            <Snackbar open={changesHaveBeenSaved} anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}>
                <Alert severity="success">Änderungen erfolgreich gespeichert</Alert>
            </Snackbar>

            <Dialog open={showDeleteDialog} onClose={(): void => setShowDeleteDialog(false)}>
                <DialogContent>
                    <VStack className="gap-8 relative box-border">
                        <VStack className="absolute top-0 right-0">
                            <PEIconButton
                                iconSize={24}
                                icon={Icon.close}
                                onClick={(): void => setShowDeleteDialog(false)}
                                withoutShadow
                                bg="white"
                            />
                        </VStack>

                        <p className="m-0 mt-2 text-text-m-bold w-full text-start">Menü löschen</p>

                        <p className="m-0 w-full text-start">Soll {menu.title} wirklich gelöscht werden?</p>

                        <HStack className="w-full gap-4">
                            <PEButton onClick={(): void => setShowDeleteDialog(false)} title={t('cancel-button')} type="secondary" />
                            <PEButton
                                title={t('create-meal-dropdown-delete')}
                                onClick={(): void => {
                                    deleteMenu()
                                        .then(({ data: deleteData }) => {
                                            if (deleteData?.cooks?.menus?.success) onDelete();
                                        })
                                        .catch((error) => console.log(error));
                                }}
                            />
                        </HStack>
                    </VStack>
                </DialogContent>
            </Dialog>
        </VStack>
    );
}
