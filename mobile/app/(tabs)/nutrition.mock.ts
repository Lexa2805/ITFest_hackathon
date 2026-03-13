export type NutritionFilter = {
    id: string;
    label: string;
};

export type MacroTarget = {
    label: string;
    current: number;
    target: number;
    accentColor: string;
};

export type RecipeSuggestion = {
    name: string;
    prepTime: string;
    calories: number;
    description: string;
    tag: string;
};

export type MissingIngredient = {
    name: string;
    amount: string;
    group: string;
};

export type MealSuggestion = {
    mealType: string;
    title: string;
    calories: number;
    macroHint: string;
};

export const nutritionHeader = {
    title: 'Your Nutrition Plan',
    subtitle: 'AI-curated meal ideas based on your goals, health profile, and fridge inventory.',
};

export const nutritionFilters: NutritionFilter[] = [
    { id: 'calorie-goal', label: 'Calorie Goal' },
    { id: 'high-protein', label: 'High Protein' },
    { id: 'low-carb', label: 'Low Carb' },
    { id: 'quick-meals', label: 'Quick Meals' },
    { id: 'fridge-only', label: 'Fridge Only' },
];

export const dailySummary = {
    targetCalories: 2200,
    consumedCalories: 1460,
    remainingCalories: 740,
};

export const macroTargets: MacroTarget[] = [
    { label: 'Protein', current: 92, target: 130, accentColor: '#5B8DEF' },
    { label: 'Carbs', current: 148, target: 220, accentColor: '#6EC8A8' },
    { label: 'Fats', current: 51, target: 70, accentColor: '#F5A66B' },
];

export const fridgeBasedRecipes: RecipeSuggestion[] = [
    {
        name: 'Greek Yogurt Chicken Bowl',
        prepTime: '24 min',
        calories: 540,
        description: 'Creamy protein bowl with chicken, yogurt dressing, and crunchy veggies.',
        tag: 'High Protein',
    },
    {
        name: 'Spinach Egg Wrap',
        prepTime: '14 min',
        calories: 360,
        description: 'Quick wrap using eggs and spinach from your fridge for a balanced lunch.',
        tag: 'Balanced',
    },
    {
        name: 'Salmon Zucchini Plate',
        prepTime: '28 min',
        calories: 490,
        description: 'Pan-seared salmon with sautéed zucchini for a light low-carb dinner.',
        tag: 'Low Carb',
    },
];

export const missingIngredients: MissingIngredient[] = [
    { name: 'Quinoa', amount: '250 g', group: 'Grains' },
    { name: 'Cherry Tomatoes', amount: '1 pack', group: 'Produce' },
    { name: 'Avocado', amount: '2 pcs', group: 'Produce' },
    { name: 'Olive Oil', amount: '1 bottle', group: 'Pantry' },
];

export const recommendedMeals: MealSuggestion[] = [
    { mealType: 'Breakfast', title: 'Protein Oats & Berries', calories: 420, macroHint: 'P 28g • C 42g • F 12g' },
    { mealType: 'Lunch', title: 'Chicken Lentil Power Bowl', calories: 560, macroHint: 'P 41g • C 48g • F 17g' },
    { mealType: 'Dinner', title: 'Salmon Veggie Stir Fry', calories: 520, macroHint: 'P 36g • C 30g • F 24g' },
    { mealType: 'Snack', title: 'Yogurt + Nuts Cup', calories: 240, macroHint: 'P 16g • C 12g • F 13g' },
];

export const healthAwareMessage =
    'Suggestions are dynamically adjusted to your calorie target, current health signals, and available fridge ingredients.';