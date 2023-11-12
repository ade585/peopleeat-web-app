import { Dialog, DialogActions, DialogContent, DialogContentText, DialogTitle } from '@mui/material';
import useTranslation from 'next-translate/useTranslation';
import { useState, type ReactElement } from 'react';
import { type MealType } from '../../../../../../data-source/generated/graphql';
import useResponsive from '../../../../../../hooks/useResponsive';
import { mealTypeTranslations } from '../../../../../../shared-domain/mealTypeTranslations';
import { mealTypes } from '../../../../../../shared-domain/mealTypes';
import PEMealCardDesktop from '../../../../../cards/mealCard/PEMealCardDesktop';
import PEButton from '../../../../../standard/buttons/PEButton';
import { Icon } from '../../../../../standard/icon/Icon';
import PEIconButton from '../../../../../standard/iconButton/PEIconButton';
import PETabItem from '../../../../../standard/tabItem/PETabItem';
import HStack from '../../../../../utility/hStack/HStack';
import Spacer from '../../../../../utility/spacer/Spacer';
import VStack from '../../../../../utility/vStack/VStack';
import { type MealEntity } from '../../ChefProfilePageMenusTab';

export interface UpdateCookMenuCourseDto {
    title: string;
    mealOptions: MealEntity[];
}

export interface UpdateCookMenuCourseProps {
    meals: MealEntity[];
    open: boolean;
    onSuccess: (course: UpdateCookMenuCourseDto, index?: number) => void;
    onCancel: () => void;
    title: string;
    selectedCourseMeals: Map<string, MealEntity>;
}

export default function UpdateCookMenuCourseDialog({
    open,
    meals,
    onSuccess,
    onCancel,
    title,
    selectedCourseMeals,
}: UpdateCookMenuCourseProps): ReactElement {
    const { isMobile } = useResponsive();
    const { t: translateMealType } = useTranslation('meal-types');
    const { t } = useTranslation('chef-profile');

    const [selectedMealType, setSelectedMealType] = useState<MealType | 'ALL'>('ALL');

    const [selectedMeals, setSelectedMeals] = useState<Map<string, MealEntity>>(selectedCourseMeals);

    return (
        <Dialog open={open} maxWidth="md">
            <DialogTitle>
                <HStack>
                    <span>{t('create-menu-add-meals-title', { courseTitle: title })}</span>
                    <Spacer />
                    <PEIconButton withoutShadow bg="white" icon={Icon.close} onClick={onCancel} iconSize={24} />
                </HStack>
            </DialogTitle>
            <DialogContent sx={{ margin: 0, padding: isMobile ? '8px' : '16px', boxSizing: 'border-box' }}>
                <DialogContentText>
                    <VStack gap={32}>
                        <HStack gap={16} className="w-full" style={{ justifyContent: 'flex-start', overflowX: 'scroll' }}>
                            <PETabItem
                                title={translateMealType('meal-type-all')}
                                onClick={(): void => setSelectedMealType('ALL')}
                                active={selectedMealType === 'ALL'}
                            />

                            {mealTypes.map((mealType, index) => (
                                <PETabItem
                                    key={index}
                                    title={translateMealType(mealTypeTranslations[mealType])}
                                    onClick={(): void => setSelectedMealType(mealType)}
                                    active={selectedMealType === mealType}
                                />
                            ))}
                        </HStack>

                        <HStack gap={16} className="w-full" style={{ flexWrap: 'wrap', justifyContent: 'flex-start' }}>
                            {meals
                                .filter(({ type }) => (selectedMealType === 'ALL' ? true : type === selectedMealType))
                                .map((meal, index) => (
                                    <div key={index} className="flex basis-[340px]">
                                        <PEMealCardDesktop
                                            onClick={(): void => {
                                                if (selectedMeals.has(meal.mealId)) selectedMeals.delete(meal.mealId);
                                                else selectedMeals.set(meal.mealId, meal);
                                                setSelectedMeals(new Map(selectedMeals));
                                            }}
                                            title={meal.title}
                                            description={meal.description}
                                            imageUrl={meal.imageUrl ?? undefined}
                                            active={selectedMeals.has(meal.mealId)}
                                        />
                                    </div>
                                ))}
                        </HStack>
                    </VStack>
                </DialogContentText>
            </DialogContent>
            <DialogActions>
                <PEButton
                    title={t('create-menu-courses-save-course')}
                    onClick={(): void => onSuccess({ title, mealOptions: Array.from(selectedMeals.values()) })}
                />
            </DialogActions>
        </Dialog>
    );
}
