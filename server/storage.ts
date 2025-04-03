import { 
  users, type User, type InsertUser,
  glucoseReadings, type GlucoseReading, type InsertGlucoseReading,
  mealPlans, type MealPlan, type InsertMealPlan,
  notes, type Note, type InsertNote
} from "@shared/schema";

// modify the interface with any CRUD methods
// you might need
export interface IStorage {
  // Users
  getUser(id: number): Promise<User | undefined>;
  getUserByUsername(username: string): Promise<User | undefined>;
  getUserByEmail(email: string): Promise<User | undefined>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, user: Partial<InsertUser>): Promise<User | undefined>;

  // Glucose Readings
  getGlucoseReadings(userId: number, limit?: number): Promise<GlucoseReading[]>;
  getGlucoseReadingsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<GlucoseReading[]>;
  getGlucoseReading(id: number): Promise<GlucoseReading | undefined>;
  createGlucoseReading(reading: InsertGlucoseReading): Promise<GlucoseReading>;
  updateGlucoseReading(id: number, reading: Partial<InsertGlucoseReading>): Promise<GlucoseReading | undefined>;
  deleteGlucoseReading(id: number): Promise<boolean>;
  
  // Meal Plans
  getMealPlans(userId: number, limit?: number): Promise<MealPlan[]>;
  getMealPlansByType(userId: number, mealType: string): Promise<MealPlan[]>;
  getMealPlan(id: number): Promise<MealPlan | undefined>;
  createMealPlan(plan: InsertMealPlan): Promise<MealPlan>;
  updateMealPlan(id: number, plan: Partial<InsertMealPlan>): Promise<MealPlan | undefined>;
  deleteMealPlan(id: number): Promise<boolean>;
  
  // Notes
  getNotes(userId: number, limit?: number): Promise<Note[]>;
  getNote(id: number): Promise<Note | undefined>;
  createNote(note: InsertNote): Promise<Note>;
  updateNote(id: number, note: Partial<InsertNote>): Promise<Note | undefined>;
  deleteNote(id: number): Promise<boolean>;
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private glucoseReadings: Map<number, GlucoseReading>;
  private mealPlans: Map<number, MealPlan>;
  private notes: Map<number, Note>;
  private userIdCounter: number;
  private glucoseIdCounter: number;
  private mealPlanIdCounter: number;
  private noteIdCounter: number;

  constructor() {
    this.users = new Map();
    this.glucoseReadings = new Map();
    this.mealPlans = new Map();
    this.notes = new Map();
    this.userIdCounter = 1;
    this.glucoseIdCounter = 1;
    this.mealPlanIdCounter = 1;
    this.noteIdCounter = 1;

    // Add a demo user
    this.createUser({
      username: "demo",
      email: "demo@example.com",
      password: "password123",
      name: "John Doe",
      allergies: ["peanuts", "shellfish"]
    });
  }

  // User Methods
  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getUserByUsername(username: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.username.toLowerCase() === username.toLowerCase()
    );
  }

  async getUserByEmail(email: string): Promise<User | undefined> {
    return Array.from(this.users.values()).find(
      (user) => user.email.toLowerCase() === email.toLowerCase()
    );
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    const id = this.userIdCounter++;
    const user: User = { ...insertUser, id };
    this.users.set(id, user);

    // Create some initial demo data for the first user
    if (id === 1) {
      // Add some glucose readings
      const now = new Date();
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);

      this.createGlucoseReading({
        userId: id,
        value: 118,
        timestamp: now,
        type: "before_breakfast",
        note: "Normal reading"
      });

      this.createGlucoseReading({
        userId: id,
        value: 162,
        timestamp: yesterday,
        type: "after_lunch",
        note: "Slightly elevated"
      });

      this.createGlucoseReading({
        userId: id,
        value: 105,
        timestamp: yesterday,
        type: "before_breakfast",
        note: "Good fasting level"
      });

      const twoDaysAgo = new Date(now);
      twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
      
      this.createGlucoseReading({
        userId: id,
        value: 183,
        timestamp: twoDaysAgo,
        type: "after_meal",
        note: "High after eating pasta"
      });

      // Add some meal plans
      this.createMealPlan({
        userId: id,
        name: "Grilled Salmon with Vegetables",
        description: "Perfect for dinner - high protein, low carb option with omega-3 fatty acids.",
        mealType: "dinner",
        imageUrl: "https://images.unsplash.com/photo-1539136788836-5699e78bfc75",
        carbs: 12,
        servings: 1,
        prepTime: 30,
        tags: ["Low Carb", "High Protein"],
        ingredients: ["Salmon fillet", "Asparagus", "Bell peppers", "Olive oil", "Lemon", "Salt", "Pepper"],
        instructions: ["Preheat oven to 400°F", "Season salmon with salt, pepper and lemon", "Roast vegetables with olive oil", "Bake for 15-20 minutes"]
      });

      this.createMealPlan({
        userId: id,
        name: "Greek Yogurt Breakfast Bowl",
        description: "High protein breakfast with berries, nuts, and a touch of honey.",
        mealType: "breakfast",
        imageUrl: "https://images.unsplash.com/photo-1623428187969-5da2dcea5ebf",
        carbs: 18,
        servings: 1,
        prepTime: 10,
        tags: ["Breakfast", "High Protein"],
        ingredients: ["Greek yogurt", "Mixed berries", "Almonds", "Honey", "Cinnamon"],
        instructions: ["Add yogurt to a bowl", "Top with berries, nuts and a drizzle of honey", "Sprinkle with cinnamon"]
      });

      // Add some notes
      this.createNote({
        userId: id,
        title: "Increased activity today",
        content: "Went for a 30-minute walk after breakfast. Glucose readings were stable throughout the day.",
        timestamp: now,
        category: "Exercise"
      });

      this.createNote({
        userId: id,
        title: "High reading after dinner",
        content: "Dinner included more carbs than usual. Will try to reduce portion size next time.",
        timestamp: yesterday,
        category: "Diet"
      });
    }

    return user;
  }

  async updateUser(id: number, update: Partial<InsertUser>): Promise<User | undefined> {
    const existing = await this.getUser(id);
    if (!existing) return undefined;

    const updated: User = { ...existing, ...update };
    this.users.set(id, updated);
    return updated;
  }

  // Glucose Reading Methods
  async getGlucoseReadings(userId: number, limit?: number): Promise<GlucoseReading[]> {
    const readings = Array.from(this.glucoseReadings.values())
      .filter(reading => reading.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? readings.slice(0, limit) : readings;
  }

  async getGlucoseReadingsByDateRange(userId: number, startDate: Date, endDate: Date): Promise<GlucoseReading[]> {
    return Array.from(this.glucoseReadings.values())
      .filter(reading => 
        reading.userId === userId && 
        new Date(reading.timestamp) >= startDate && 
        new Date(reading.timestamp) <= endDate
      )
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }

  async getGlucoseReading(id: number): Promise<GlucoseReading | undefined> {
    return this.glucoseReadings.get(id);
  }

  async createGlucoseReading(reading: InsertGlucoseReading): Promise<GlucoseReading> {
    const id = this.glucoseIdCounter++;
    const newReading: GlucoseReading = { ...reading, id };
    this.glucoseReadings.set(id, newReading);
    return newReading;
  }

  async updateGlucoseReading(id: number, update: Partial<InsertGlucoseReading>): Promise<GlucoseReading | undefined> {
    const existing = await this.getGlucoseReading(id);
    if (!existing) return undefined;

    const updated: GlucoseReading = { ...existing, ...update };
    this.glucoseReadings.set(id, updated);
    return updated;
  }

  async deleteGlucoseReading(id: number): Promise<boolean> {
    return this.glucoseReadings.delete(id);
  }

  // Meal Plan Methods
  async getMealPlans(userId: number, limit?: number): Promise<MealPlan[]> {
    const plans = Array.from(this.mealPlans.values())
      .filter(plan => plan.userId === userId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
    
    return limit ? plans.slice(0, limit) : plans;
  }

  async getMealPlansByType(userId: number, mealType: string): Promise<MealPlan[]> {
    return Array.from(this.mealPlans.values())
      .filter(plan => plan.userId === userId && plan.mealType === mealType)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  }

  async getMealPlan(id: number): Promise<MealPlan | undefined> {
    return this.mealPlans.get(id);
  }

  async createMealPlan(plan: InsertMealPlan): Promise<MealPlan> {
    const id = this.mealPlanIdCounter++;
    const newPlan: MealPlan = { 
      ...plan, 
      id, 
      createdAt: plan.createdAt || new Date() 
    };
    this.mealPlans.set(id, newPlan);
    return newPlan;
  }

  async updateMealPlan(id: number, update: Partial<InsertMealPlan>): Promise<MealPlan | undefined> {
    const existing = await this.getMealPlan(id);
    if (!existing) return undefined;

    const updated: MealPlan = { ...existing, ...update };
    this.mealPlans.set(id, updated);
    return updated;
  }

  async deleteMealPlan(id: number): Promise<boolean> {
    return this.mealPlans.delete(id);
  }

  // Notes Methods
  async getNotes(userId: number, limit?: number): Promise<Note[]> {
    const userNotes = Array.from(this.notes.values())
      .filter(note => note.userId === userId)
      .sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
    
    return limit ? userNotes.slice(0, limit) : userNotes;
  }

  async getNote(id: number): Promise<Note | undefined> {
    return this.notes.get(id);
  }

  async createNote(note: InsertNote): Promise<Note> {
    const id = this.noteIdCounter++;
    const newNote: Note = { ...note, id };
    this.notes.set(id, newNote);
    return newNote;
  }

  async updateNote(id: number, update: Partial<InsertNote>): Promise<Note | undefined> {
    const existing = await this.getNote(id);
    if (!existing) return undefined;

    const updated: Note = { ...existing, ...update };
    this.notes.set(id, updated);
    return updated;
  }

  async deleteNote(id: number): Promise<boolean> {
    return this.notes.delete(id);
  }
}

export const storage = new MemStorage();
