# Nutrition Integration Implementation Plan

The goal is to connect the React Native frontend [nutrition.tsx](file:///d:/ITFest_Hackathon/mobile/app/%28tabs%29/nutrition.tsx) screen to the FastAPI backend endpoints, replacing the currently mocked data with live data fetched via Axios.

## User Review Required

- **Is the application currently running on an emulator or physical device?** The verification will require running the Expo app.
- **Recommended Meals**: The [nutrition.mock.ts](file:///d:/ITFest_Hackathon/mobile/app/%28tabs%29/nutrition.mock.ts) file includes some statically specified recommended meals for different times of the day. The backend doesn't seem to have a specific endpoint for these exact categories currently. We will leave these as static placeholders or hide them for now. Is that okay?

## Proposed Changes

### mobile/services/

#### [NEW] [nutritionApi.ts](file:///d:/ITFest_Hackathon/mobile/services/nutritionApi.ts)
- Define TypeScript interfaces matching [backend/app/schemas/nutrition.py](file:///d:/ITFest_Hackathon/backend/app/schemas/nutrition.py) ([DailyLogResponse](file:///d:/ITFest_Hackathon/backend/app/schemas/nutrition.py#67-86), [RecipeResponse](file:///d:/ITFest_Hackathon/backend/app/schemas/nutrition.py#48-52), [ShoppingListResponse](file:///d:/ITFest_Hackathon/backend/app/schemas/nutrition.py#98-104), etc.).
- Create API wrapper functions using the existing Axios instance ([mobile/services/api.ts](file:///d:/ITFest_Hackathon/mobile/services/api.ts)):
  - `getTodayLog()` -> `GET /nutrition/log/today`
  - `suggestRecipes()` -> `POST /nutrition/recipes/suggest`
  - `getLatestShoppingList()` -> `GET /nutrition/shopping-list/latest`

### mobile/app/(tabs)/

#### [MODIFY] [nutrition.tsx](file:///d:/ITFest_Hackathon/mobile/app/%28tabs%29/nutrition.tsx)
- Integrate React state (`useState`) and side effects (`useEffect`) to load data from `nutritionApi.ts` on screen mount.
- Add a loading indicator (e.g., `ActivityIndicator`) while fetching data.
- Replace mock data usages with live data:
  - Map [DailyLogResponse](file:///d:/ITFest_Hackathon/backend/app/schemas/nutrition.py#67-86) to `dailySummary` (target, consumed, remaining calories) and `macroTargets`.
  - Map `RecipeResponse[]` to `fridgeBasedRecipes`.
  - Map `ShoppingListResponse.items` to `missingIngredients`.

## Verification Plan

### Automated Tests
- None are currently configured for frontend integration.

### Manual Verification
1. Open the Expo GO app or Web interface.
2. Navigate to the Nutrition tab.
3. Verify that a loader appears briefly.
4. Verify that data (Daily Summary, Missing Ingredients, Recipes) matches what the backend returns for the logged-in user.
