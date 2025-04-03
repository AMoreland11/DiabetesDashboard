// the newest OpenAI model is "gpt-4o" which was released May 13, 2024. do not change this unless explicitly requested by the user

export interface MealPlanResponse {
  name: string;
  description: string;
  mealType: string;
  imageUrl?: string;
  carbs: number;
  servings: number;
  prepTime: number;
  tags: string[];
  ingredients: string[];
  instructions: string[];
}

// Sample meal plan image URLs
const mealImages = {
  breakfast: [
    "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf",
    "https://images.unsplash.com/photo-1525351484163-7529414344d8",
    "https://images.unsplash.com/photo-1533089860892-a7c6f0a88666"
  ],
  lunch: [
    "https://images.unsplash.com/photo-1490645935967-10de6ba17061",
    "https://images.unsplash.com/photo-1546069901-ba9599a7e63c",
    "https://images.unsplash.com/photo-1512621776951-a57141f2eefd"
  ],
  dinner: [
    "https://images.unsplash.com/photo-1539136788836-5699e78bfc75",
    "https://images.unsplash.com/photo-1467003909585-2f8a72700288",
    "https://images.unsplash.com/photo-1559847844-5315695dadae"
  ],
  snack: [
    "https://images.unsplash.com/photo-1486328228599-85db4443971f",
    "https://images.unsplash.com/photo-1624300629298-e9de39c13be6",
    "https://images.unsplash.com/photo-1593115590229-5c97a4c87b5d"
  ]
};

export async function generateMealPlan(mealType: string, allergies: string[] = []): Promise<MealPlanResponse> {
  try {
    const apiKey = process.env.OPENAI_API_KEY;

    // If no API key is available, return a sample meal plan
    if (!apiKey) {
      console.warn("OPENAI_API_KEY is not available. Using sample meal plan data.");
      return getSampleMealPlan(mealType, allergies);
    }

    const allergiesText = allergies.length > 0 
      ? `The person has the following allergies: ${allergies.join(", ")}. Ensure the meal doesn't include these ingredients.` 
      : "The person has no known food allergies.";

    const prompt = `
      Generate a diabetic-friendly ${mealType} recipe that is suitable for someone with diabetes.
      ${allergiesText}
      The recipe should have a low glycemic index and be balanced in terms of carbohydrates, proteins, and healthy fats.
      
      Provide the result in the following JSON format:
      {
        "name": "Recipe Name",
        "description": "A brief description of the meal",
        "mealType": "${mealType}",
        "carbs": integer (estimated carbohydrates in grams),
        "servings": integer,
        "prepTime": integer (in minutes),
        "tags": ["tag1", "tag2"],
        "ingredients": ["ingredient1", "ingredient2", ...],
        "instructions": ["step1", "step2", ...]
      }
    `;

    const response = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: "gpt-4o",
        messages: [
          {
            role: "system",
            content: "You are a nutritionist specialized in diabetic meal planning. You create healthy, balanced meal plans that help regulate blood sugar levels."
          },
          {
            role: "user",
            content: prompt
          }
        ],
        response_format: { type: "json_object" }
      })
    });

    if (!response.ok) {
      throw new Error(`API request failed: ${response.status} ${response.statusText}`);
    }

    const data = await response.json();
    const mealPlan: MealPlanResponse = JSON.parse(data.choices[0].message.content);

    // Add a sample image URL based on meal type
    const imageIndex = Math.floor(Math.random() * mealImages[mealType as keyof typeof mealImages].length);
    mealPlan.imageUrl = mealImages[mealType as keyof typeof mealImages][imageIndex];

    return mealPlan;
  } catch (error) {
    console.error("Error generating meal plan:", error);
    // Fallback to sample meal plan
    return getSampleMealPlan(mealType, allergies);
  }
}

function getSampleMealPlan(mealType: string, allergies: string[]): MealPlanResponse {
  const allergyFilter = (ingredients: string[]) => {
    return ingredients.filter(ingredient => 
      !allergies.some(allergy => 
        ingredient.toLowerCase().includes(allergy.toLowerCase())
      )
    );
  };

  const samples: Record<string, MealPlanResponse> = {
    breakfast: {
      name: "Greek Yogurt Breakfast Bowl",
      description: "High protein breakfast with berries, nuts, and a touch of honey.",
      mealType: "breakfast",
      carbs: 18,
      servings: 1,
      prepTime: 10,
      tags: ["Breakfast", "High Protein"],
      ingredients: allergyFilter(["Greek yogurt", "Mixed berries", "Almonds", "Honey", "Cinnamon"]),
      instructions: ["Add yogurt to a bowl", "Top with berries, nuts and a drizzle of honey", "Sprinkle with cinnamon"],
      imageUrl: mealImages.breakfast[0]
    },
    lunch: {
      name: "Quinoa Bowl with Chickpeas",
      description: "Plant-based protein with complex carbs for sustained energy.",
      mealType: "lunch",
      carbs: 32,
      servings: 1,
      prepTime: 20,
      tags: ["Lunch", "Vegetarian"],
      ingredients: allergyFilter(["Quinoa", "Chickpeas", "Bell peppers", "Cucumber", "Olive oil", "Lemon juice", "Salt", "Pepper", "Parsley"]),
      instructions: [
        "Cook quinoa according to package instructions",
        "Chop vegetables and mix with chickpeas",
        "Combine all ingredients and dress with olive oil and lemon juice",
        "Season with salt, pepper, and chopped parsley"
      ],
      imageUrl: mealImages.lunch[0]
    },
    dinner: {
      name: "Grilled Salmon with Vegetables",
      description: "Perfect for dinner - high protein, low carb option with omega-3 fatty acids.",
      mealType: "dinner",
      carbs: 12,
      servings: 1,
      prepTime: 30,
      tags: ["Low Carb", "High Protein"],
      ingredients: allergyFilter(["Salmon fillet", "Asparagus", "Bell peppers", "Olive oil", "Lemon", "Salt", "Pepper"]),
      instructions: [
        "Preheat oven to 400°F",
        "Season salmon with salt, pepper and lemon",
        "Roast vegetables with olive oil",
        "Bake for 15-20 minutes"
      ],
      imageUrl: mealImages.dinner[0]
    },
    snack: {
      name: "Veggie Sticks with Hummus",
      description: "A balanced snack with protein and fiber to keep blood sugar stable.",
      mealType: "snack",
      carbs: 15,
      servings: 1,
      prepTime: 5,
      tags: ["Low Carb", "Vegetarian"],
      ingredients: allergyFilter(["Carrot sticks", "Cucumber sticks", "Bell pepper strips", "Hummus", "Sesame seeds"]),
      instructions: [
        "Wash and cut vegetables into sticks",
        "Serve with a side of hummus",
        "Sprinkle hummus with sesame seeds"
      ],
      imageUrl: mealImages.snack[0]
    }
  };

  return samples[mealType] || samples.snack;
}
