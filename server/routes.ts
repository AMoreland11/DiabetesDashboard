import express, { type Express, Request, Response } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { 
  loginSchema, 
  registerSchema, 
  insertGlucoseReadingSchema, 
  insertMealPlanSchema, 
  insertNoteSchema,
  mealPlanRequestSchema
} from "@shared/schema";
import session from "express-session";
import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import MemoryStore from "memorystore";
import { generateMealPlan } from "../client/src/lib/openai";

// Initialize session store
const MemoryStoreSession = MemoryStore(session);

export async function registerRoutes(app: Express): Promise<Server> {
  // Configure session
  app.use(
    session({
      store: new MemoryStoreSession({
        checkPeriod: 86400000, // 24 hours
      }),
      secret: process.env.SESSION_SECRET || "glucose-tracker-secret",
      resave: false,
      saveUninitialized: false,
      cookie: {
        secure: process.env.NODE_ENV === "production",
        maxAge: 24 * 60 * 60 * 1000, // 24 hours
      },
    })
  );

  // Initialize passport
  app.use(passport.initialize());
  app.use(passport.session());

  // Configure passport local strategy
  passport.use(
    new LocalStrategy(async (username, password, done) => {
      try {
        const user = await storage.getUserByUsername(username);
        if (!user) {
          return done(null, false, { message: "Incorrect username." });
        }
        if (user.password !== password) {
          return done(null, false, { message: "Incorrect password." });
        }
        return done(null, user);
      } catch (err) {
        return done(err);
      }
    })
  );

  passport.serializeUser((user: any, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: number, done) => {
    try {
      const user = await storage.getUser(id);
      done(null, user);
    } catch (err) {
      done(err);
    }
  });

  // Auth routes
  app.post("/api/auth/login", (req, res, next) => {
    try {
      const result = loginSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }

      passport.authenticate("local", (err: any, user: any, info: any) => {
        if (err) {
          return next(err);
        }
        if (!user) {
          return res.status(401).json({ message: info.message || "Authentication failed" });
        }
        req.logIn(user, (err) => {
          if (err) {
            return next(err);
          }
          // Don't send password to client
          const { password, ...userWithoutPassword } = user;
          return res.json({ user: userWithoutPassword });
        });
      })(req, res, next);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/register", async (req, res, next) => {
    try {
      const result = registerSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }

      const { confirmPassword, ...userData } = result.data;

      // Check if user already exists
      const existingUser = await storage.getUserByUsername(userData.username);
      if (existingUser) {
        return res.status(400).json({ message: "Username already taken" });
      }

      const existingEmail = await storage.getUserByEmail(userData.email);
      if (existingEmail) {
        return res.status(400).json({ message: "Email already registered" });
      }

      const newUser = await storage.createUser(userData);
      
      // Auto login after registration
      req.logIn(newUser, (err) => {
        if (err) {
          return next(err);
        }
        // Don't send password to client
        const { password, ...userWithoutPassword } = newUser;
        return res.status(201).json({ user: userWithoutPassword });
      });
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/auth/logout", (req, res) => {
    req.logout(() => {
      res.json({ message: "Logged out successfully" });
    });
  });

  app.get("/api/auth/current-user", (req, res) => {
    if (!req.isAuthenticated()) {
      return res.status(401).json({ message: "Not authenticated" });
    }
    const { password, ...userWithoutPassword } = req.user as any;
    res.json({ user: userWithoutPassword });
  });

  // Middleware to check if user is authenticated
  const ensureAuthenticated = (req: Request, res: Response, next: any) => {
    if (req.isAuthenticated()) {
      return next();
    }
    res.status(401).json({ message: "Not authenticated" });
  };

  // Glucose Reading routes
  app.get("/api/glucose", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const readings = await storage.getGlucoseReadings(userId);
      res.json(readings);
    } catch (error) {
      next(error);
    }
  });

  app.get("/api/glucose/range", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const { start, end } = req.query;
      
      if (!start || !end) {
        return res.status(400).json({ message: "Start and end dates are required" });
      }
      
      const startDate = new Date(start as string);
      const endDate = new Date(end as string);
      
      if (isNaN(startDate.getTime()) || isNaN(endDate.getTime())) {
        return res.status(400).json({ message: "Invalid date format" });
      }
      
      const readings = await storage.getGlucoseReadingsByDateRange(userId, startDate, endDate);
      res.json(readings);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/glucose", ensureAuthenticated, async (req, res, next) => {
    try {
      const result = insertGlucoseReadingSchema.safeParse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }
      
      const newReading = await storage.createGlucoseReading(result.data);
      res.status(201).json(newReading);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/glucose/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const reading = await storage.getGlucoseReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      if (reading.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this reading" });
      }
      
      const result = insertGlucoseReadingSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }
      
      const updatedReading = await storage.updateGlucoseReading(id, result.data);
      res.json(updatedReading);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/glucose/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const reading = await storage.getGlucoseReading(id);
      if (!reading) {
        return res.status(404).json({ message: "Reading not found" });
      }
      
      if (reading.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this reading" });
      }
      
      await storage.deleteGlucoseReading(id);
      res.json({ message: "Reading deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Meal Plan routes
  app.get("/api/meal-plans", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const { type } = req.query;
      
      let plans;
      if (type) {
        plans = await storage.getMealPlansByType(userId, type as string);
      } else {
        plans = await storage.getMealPlans(userId);
      }
      
      res.json(plans);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/meal-plans", ensureAuthenticated, async (req, res, next) => {
    try {
      const result = insertMealPlanSchema.safeParse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }
      
      const newPlan = await storage.createMealPlan(result.data);
      res.status(201).json(newPlan);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/meal-plans/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const plan = await storage.getMealPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      if (plan.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this meal plan" });
      }
      
      const result = insertMealPlanSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }
      
      const updatedPlan = await storage.updateMealPlan(id, result.data);
      res.json(updatedPlan);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/meal-plans/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const plan = await storage.getMealPlan(id);
      if (!plan) {
        return res.status(404).json({ message: "Meal plan not found" });
      }
      
      if (plan.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this meal plan" });
      }
      
      await storage.deleteMealPlan(id);
      res.json({ message: "Meal plan deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // AI Meal Plan Generation
  app.post("/api/generate-meal-plan", ensureAuthenticated, async (req, res, next) => {
    try {
      const result = mealPlanRequestSchema.safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }
      
      const { mealType, allergies } = result.data;
      const userId = (req.user as any).id;
      
      // Get user allergies if not provided
      let userAllergies = allergies;
      if (!userAllergies) {
        const user = await storage.getUser(userId);
        userAllergies = user?.allergies || [];
      }
      
      try {
        const mealPlan = await generateMealPlan(mealType, userAllergies);
        
        // Save the generated meal plan
        if (mealPlan) {
          const savedMealPlan = await storage.createMealPlan({
            userId,
            name: mealPlan.name,
            description: mealPlan.description,
            mealType,
            imageUrl: mealPlan.imageUrl || "",
            carbs: mealPlan.carbs,
            servings: mealPlan.servings,
            prepTime: mealPlan.prepTime,
            tags: mealPlan.tags,
            ingredients: mealPlan.ingredients,
            instructions: mealPlan.instructions
          });
          
          res.json(savedMealPlan);
        } else {
          res.status(500).json({ message: "Failed to generate meal plan" });
        }
      } catch (error: any) {
        console.error("Meal plan generation error:", error);
        res.status(500).json({ message: "Error generating meal plan", error: error.message });
      }
    } catch (error) {
      next(error);
    }
  });

  // Notes routes
  app.get("/api/notes", ensureAuthenticated, async (req, res, next) => {
    try {
      const userId = (req.user as any).id;
      const notes = await storage.getNotes(userId);
      res.json(notes);
    } catch (error) {
      next(error);
    }
  });

  app.post("/api/notes", ensureAuthenticated, async (req, res, next) => {
    try {
      const result = insertNoteSchema.safeParse({
        ...req.body,
        userId: (req.user as any).id
      });
      
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }
      
      const newNote = await storage.createNote(result.data);
      res.status(201).json(newNote);
    } catch (error) {
      next(error);
    }
  });

  app.put("/api/notes/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const note = await storage.getNote(id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      if (note.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to update this note" });
      }
      
      const result = insertNoteSchema.partial().safeParse(req.body);
      if (!result.success) {
        return res.status(400).json({ message: "Invalid request data", errors: result.error.format() });
      }
      
      const updatedNote = await storage.updateNote(id, result.data);
      res.json(updatedNote);
    } catch (error) {
      next(error);
    }
  });

  app.delete("/api/notes/:id", ensureAuthenticated, async (req, res, next) => {
    try {
      const id = parseInt(req.params.id);
      const userId = (req.user as any).id;
      
      const note = await storage.getNote(id);
      if (!note) {
        return res.status(404).json({ message: "Note not found" });
      }
      
      if (note.userId !== userId) {
        return res.status(403).json({ message: "Not authorized to delete this note" });
      }
      
      await storage.deleteNote(id);
      res.json({ message: "Note deleted successfully" });
    } catch (error) {
      next(error);
    }
  });

  // Create HTTP server
  const httpServer = createServer(app);

  return httpServer;
}
