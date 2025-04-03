import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { useState } from "react";
import { useAuth } from "@/lib/auth";
import { useQuery, useMutation } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { queryClient } from "@/lib/queryClient";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { GlucoseReading, MealPlan, Note } from "@shared/schema";
import { Loader2, Plus, TrendingDown, TrendingUp } from "lucide-react";
import { format } from "date-fns";
import { GlucoseChart } from "@/components/ui/glucose-chart";
import { ReadingLabel } from "@/components/ui/reading-label";

// Form schema for glucose reading
const glucoseFormSchema = z.object({
  value: z.coerce.number().min(20).max(600),
  type: z.string().min(1),
  note: z.string().optional(),
  timestamp: z.string().optional(),
});

// Form schema for generating meal plan
const mealPlanFormSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
});

export default function Dashboard() {
  const { toast } = useToast();
  const { user } = useAuth();
  const [timeRange, setTimeRange] = useState<'7days' | '30days' | 'custom'>('7days');
  const [glucoseDialogOpen, setGlucoseDialogOpen] = useState(false);
  const [mealPlanDialogOpen, setMealPlanDialogOpen] = useState(false);
  
  // Queries
  const { data: glucoseReadings, isLoading: glucoseLoading } = useQuery({
    queryKey: ['/api/glucose'],
    refetchInterval: false,
  });

  const { data: mealPlans, isLoading: mealPlansLoading } = useQuery({
    queryKey: ['/api/meal-plans'],
    refetchInterval: false,
  });

  const { data: notes, isLoading: notesLoading } = useQuery({
    queryKey: ['/api/notes'],
    refetchInterval: false,
  });

  // Forms
  const glucoseForm = useForm<z.infer<typeof glucoseFormSchema>>({
    resolver: zodResolver(glucoseFormSchema),
    defaultValues: {
      value: undefined,
      type: "before_breakfast",
      note: "",
      timestamp: new Date().toISOString(),
    },
  });

  const mealPlanForm = useForm<z.infer<typeof mealPlanFormSchema>>({
    resolver: zodResolver(mealPlanFormSchema),
    defaultValues: {
      mealType: "breakfast",
    },
  });

  // Mutations
  const addGlucoseReadingMutation = useMutation({
    mutationFn: async (values: z.infer<typeof glucoseFormSchema>) => {
      const response = await apiRequest('POST', '/api/glucose', values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/glucose'] });
      setGlucoseDialogOpen(false);
      glucoseForm.reset();
      toast({
        title: "Success",
        description: "Glucose reading added successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to add glucose reading",
        variant: "destructive",
      });
    },
  });

  const generateMealPlanMutation = useMutation({
    mutationFn: async (values: z.infer<typeof mealPlanFormSchema>) => {
      const response = await apiRequest('POST', '/api/generate-meal-plan', values);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      setMealPlanDialogOpen(false);
      mealPlanForm.reset();
      toast({
        title: "Success",
        description: "Meal plan generated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate meal plan",
        variant: "destructive",
      });
    },
  });

  const onGlucoseSubmit = (values: z.infer<typeof glucoseFormSchema>) => {
    addGlucoseReadingMutation.mutate(values);
  };

  const onMealPlanSubmit = (values: z.infer<typeof mealPlanFormSchema>) => {
    generateMealPlanMutation.mutate(values);
  };

  // Calculate stats
  const calculateStats = (readings: GlucoseReading[]) => {
    if (!readings || readings.length === 0) {
      return {
        avgGlucose: 0,
        highGlucose: 0,
        highDate: '',
        inRange: 0,
      };
    }

    const sum = readings.reduce((acc, reading) => acc + reading.value, 0);
    const avg = Math.round(sum / readings.length);
    
    const sorted = [...readings].sort((a, b) => b.value - a.value);
    const highest = sorted[0];
    
    const inRange = readings.filter(r => r.value >= 70 && r.value <= 140).length;
    const percentage = Math.round((inRange / readings.length) * 100);

    return {
      avgGlucose: avg,
      highGlucose: highest.value,
      highDate: format(new Date(highest.timestamp), 'MMM dd, h:mm a'),
      inRange: percentage,
    };
  };

  const stats = calculateStats(glucoseReadings || []);

  // Get appropriate date range
  const getDateRange = () => {
    const now = new Date();
    let startDate: Date;
    
    if (timeRange === '7days') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 7);
    } else if (timeRange === '30days') {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 30);
    } else {
      startDate = new Date(now);
      startDate.setDate(now.getDate() - 60); // Custom range (max 2 months)
    }
    
    return { startDate, endDate: now };
  };

  const { startDate, endDate } = getDateRange();

  // Filter readings by date range
  const filteredReadings = glucoseReadings
    ? glucoseReadings.filter((reading: GlucoseReading) => {
        const readingDate = new Date(reading.timestamp);
        return readingDate >= startDate && readingDate <= endDate;
      })
    : [];

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900 mb-2">Welcome back, {user?.name || user?.username}!</h1>
          <p className="text-gray-600">Here's an overview of your glucose levels and meal plans.</p>
        </div>

        {/* Quick Actions Section */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
          <Button
            variant="outline"
            className="flex items-center space-x-3 h-auto py-4 hover:border-primary hover:shadow-md transition duration-200"
            onClick={() => setGlucoseDialogOpen(true)}
          >
            <div className="w-10 h-10 rounded-full bg-primary bg-opacity-10 flex items-center justify-center">
              <Plus className="h-5 w-5 text-primary" />
            </div>
            <span className="font-medium text-gray-800">Add Glucose Reading</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center space-x-3 h-auto py-4 hover:border-secondary hover:shadow-md transition duration-200"
            onClick={() => {
              toast({
                title: "Coming Soon",
                description: "Meal logging will be available in a future update!",
              });
            }}
          >
            <div className="w-10 h-10 rounded-full bg-secondary bg-opacity-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-secondary" viewBox="0 0 20 20" fill="currentColor">
                <path d="M3 4a1 1 0 011-1h12a1 1 0 011 1v2a1 1 0 01-1 1H4a1 1 0 01-1-1V4zM3 10a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H4a1 1 0 01-1-1v-6zM14 9a1 1 0 00-1 1v6a1 1 0 001 1h2a1 1 0 001-1v-6a1 1 0 00-1-1h-2z" />
              </svg>
            </div>
            <span className="font-medium text-gray-800">Log Meal</span>
          </Button>
          
          <Button
            variant="outline"
            className="flex items-center space-x-3 h-auto py-4 hover:border-warning hover:shadow-md transition duration-200"
            onClick={() => setMealPlanDialogOpen(true)}
          >
            <div className="w-10 h-10 rounded-full bg-warning bg-opacity-10 flex items-center justify-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-warning" viewBox="0 0 20 20" fill="currentColor">
                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
              </svg>
            </div>
            <span className="font-medium text-gray-800">Generate Meal Plan</span>
          </Button>
        </div>

        {/* Glucose Overview Section */}
        <div className="mb-8">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-xl font-semibold text-gray-900">Glucose Overview</h2>
            <div className="flex space-x-2">
              <Button
                variant={timeRange === '7days' ? 'default' : 'outline'}
                size="sm" 
                onClick={() => setTimeRange('7days')}
              >
                Last 7 Days
              </Button>
              <Button
                variant={timeRange === '30days' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('30days')}
              >
                Last 30 Days
              </Button>
              <Button
                variant={timeRange === 'custom' ? 'default' : 'outline'}
                size="sm"
                onClick={() => setTimeRange('custom')}
              >
                Custom
              </Button>
            </div>
          </div>
          
          <Card>
            <CardContent className="pt-6">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <div className="p-4 bg-primary bg-opacity-5 rounded-lg border border-primary border-opacity-20">
                  <div className="text-sm text-gray-500 mb-1">Average Glucose</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.avgGlucose ? `${stats.avgGlucose} mg/dL` : 'No data'}
                  </div>
                  {glucoseReadings && glucoseReadings.length > 1 && (
                    <div className="text-sm text-secondary flex items-center mt-1">
                      <TrendingDown className="h-4 w-4 mr-1" />
                      Down 3% from last week
                    </div>
                  )}
                </div>
                
                <div className="p-4 bg-secondary bg-opacity-5 rounded-lg border border-secondary border-opacity-20">
                  <div className="text-sm text-gray-500 mb-1">Highest Reading</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.highGlucose ? `${stats.highGlucose} mg/dL` : 'No data'}
                  </div>
                  {stats.highDate && (
                    <div className="text-sm text-gray-500 mt-1">{stats.highDate}</div>
                  )}
                </div>
                
                <div className="p-4 bg-gray-50 rounded-lg border border-gray-200">
                  <div className="text-sm text-gray-500 mb-1">In Target Range</div>
                  <div className="text-2xl font-semibold text-gray-900">
                    {stats.inRange ? `${stats.inRange}%` : 'No data'}
                  </div>
                  {glucoseReadings && glucoseReadings.length > 1 && (
                    <div className="text-sm text-secondary flex items-center mt-1">
                      <TrendingUp className="h-4 w-4 mr-1" />
                      Up 5% from last week
                    </div>
                  )}
                </div>
              </div>
              
              <div className="chart-container">
                {glucoseLoading ? (
                  <div className="flex items-center justify-center h-64">
                    <Loader2 className="h-8 w-8 animate-spin text-primary" />
                  </div>
                ) : (
                  <GlucoseChart data={filteredReadings} timeRange={timeRange} />
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Latest Readings Section */}
          <div className="md:col-span-1">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">Latest Readings</h3>
                <Button variant="link" size="sm" className="px-0" asChild>
                  <a href="/glucose-log">See All</a>
                </Button>
              </div>
              
              <div className="divide-y divide-gray-200">
                {glucoseLoading ? (
                  <div className="p-4 flex justify-center">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : glucoseReadings && glucoseReadings.length > 0 ? (
                  glucoseReadings.slice(0, 4).map((reading: GlucoseReading) => (
                    <div key={reading.id} className="p-4 flex items-center space-x-4">
                      <ReadingLabel value={reading.value} withText={false} />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-gray-900">
                          {format(new Date(reading.timestamp), 'PPP, h:mm a')}
                        </p>
                        <p className="text-sm text-gray-500">
                          {reading.type.replace('_', ' ')}
                        </p>
                      </div>
                      <div className="flex-shrink-0">
                        <ReadingLabel value={reading.value} />
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-4 text-center text-gray-500">
                    No readings found. Add your first reading!
                  </div>
                )}
              </div>
              
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200">
                <Button 
                  className="w-full"
                  onClick={() => setGlucoseDialogOpen(true)}
                >
                  Add New Reading
                </Button>
              </div>
            </Card>
          </div>

          {/* Meal Plans Section */}
          <div className="md:col-span-2">
            <Card>
              <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
                <h3 className="font-medium text-gray-900">AI-Generated Meal Plans</h3>
                <div className="flex space-x-2">
                  <Button variant="outline" size="sm" className="h-8">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M3 3a1 1 0 011-1h12a1 1 0 011 1v3a1 1 0 01-.293.707L12 11.414V15a1 1 0 01-.293.707l-2 2A1 1 0 018 17v-5.586L3.293 6.707A1 1 0 013 6V3z" clipRule="evenodd" />
                    </svg>
                    Filter Allergens
                  </Button>
                  <Button size="sm" className="h-8" onClick={() => setMealPlanDialogOpen(true)}>
                    <Plus className="h-4 w-4 mr-1" />
                    Generate New Plans
                  </Button>
                </div>
              </div>
              
              <div className="p-4 grid grid-cols-1 sm:grid-cols-2 gap-4">
                {mealPlansLoading ? (
                  <div className="col-span-2 flex justify-center p-4">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : mealPlans && mealPlans.length > 0 ? (
                  mealPlans.slice(0, 4).map((plan: MealPlan) => (
                    <div key={plan.id} className="bg-white rounded-lg border border-gray-200 overflow-hidden meal-card transition duration-200 hover:shadow-md">
                      <div className="h-40 bg-gray-200 relative">
                        <img src={plan.imageUrl} alt={plan.name} className="w-full h-full object-cover" />
                        <div className="absolute top-2 right-2">
                          <span className="inline-flex items-center px-2 py-1 rounded-full text-xs font-medium bg-green-100 text-green-800">
                            {plan.tags && plan.tags.length > 0 ? plan.tags[0] : plan.mealType}
                          </span>
                        </div>
                      </div>
                      <div className="p-4">
                        <h4 className="text-sm font-semibold text-gray-900 mb-1">{plan.name}</h4>
                        <p className="text-xs text-gray-500 mb-2">{plan.description}</p>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-2 text-xs text-gray-500">
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-secondary" viewBox="0 0 20 20" fill="currentColor">
                                <path d="M9 6a3 3 0 11-6 0 3 3 0 016 0zM17 6a3 3 0 11-6 0 3 3 0 016 0zM12.93 17c.046-.327.07-.66.07-1a6.97 6.97 0 00-1.5-4.33A5 5 0 0119 16v1h-6.07zM6 11a5 5 0 015 5v1H1v-1a5 5 0 015-5z" />
                              </svg>
                              {plan.servings} serving{plan.servings !== 1 && 's'}
                            </span>
                            <span className="flex items-center">
                              <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1 text-primary" viewBox="0 0 20 20" fill="currentColor">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm1-12a1 1 0 10-2 0v4a1 1 0 00.293.707l2.828 2.829a1 1 0 101.415-1.415L11 9.586V6z" clipRule="evenodd" />
                              </svg>
                              {plan.prepTime} min
                            </span>
                          </div>
                          <span className="text-xs font-medium text-secondary">{plan.carbs}g Carbs</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="col-span-2 text-center text-gray-500 p-4">
                    No meal plans found. Generate your first meal plan!
                  </div>
                )}
              </div>
              
              <div className="px-4 py-3 bg-gray-50 border-t border-gray-200 flex justify-center">
                <Button variant="link" className="text-primary font-medium text-sm flex items-center" asChild>
                  <a href="/meal-plans">
                    View All Meal Plans
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z" clipRule="evenodd" />
                    </svg>
                  </a>
                </Button>
              </div>
            </Card>
          </div>
        </div>

        {/* Daily Notes Section */}
        <div className="mt-8">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-semibold text-gray-900">Daily Notes & Reminders</h2>
            <Button>
              <Plus className="h-4 w-4 mr-1.5" />
              Add Note
            </Button>
          </div>
          
          <Card>
            <div className="divide-y divide-gray-200">
              {notesLoading ? (
                <div className="p-4 flex justify-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : notes && notes.length > 0 ? (
                notes.slice(0, 3).map((note: Note) => (
                  <div key={note.id} className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className="w-8 h-8 rounded-full bg-blue-100 flex items-center justify-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
                            <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                          </svg>
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900">{note.title}</h4>
                          <span className="text-xs text-gray-500">
                            {format(new Date(note.timestamp), 'PPP, h:mm a')}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600">{note.content}</p>
                        {note.category && (
                          <div className="mt-2 flex">
                            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-medium bg-gray-100 text-gray-800">
                              {note.category}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div className="p-4 text-center text-gray-500">
                  No notes found. Add your first note!
                </div>
              )}
            </div>
          </Card>
        </div>
      </div>

      {/* Add Glucose Reading Dialog */}
      <Dialog open={glucoseDialogOpen} onOpenChange={setGlucoseDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Glucose Reading</DialogTitle>
            <DialogDescription>
              Enter your glucose measurement details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...glucoseForm}>
            <form onSubmit={glucoseForm.handleSubmit(onGlucoseSubmit)} className="space-y-4">
              <FormField
                control={glucoseForm.control}
                name="value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Glucose Level (mg/dL)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="Enter value (e.g. 120)"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={glucoseForm.control}
                name="type"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>When was this reading taken?</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select when reading was taken" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="before_breakfast">Before Breakfast</SelectItem>
                        <SelectItem value="after_breakfast">After Breakfast</SelectItem>
                        <SelectItem value="before_lunch">Before Lunch</SelectItem>
                        <SelectItem value="after_lunch">After Lunch</SelectItem>
                        <SelectItem value="before_dinner">Before Dinner</SelectItem>
                        <SelectItem value="after_dinner">After Dinner</SelectItem>
                        <SelectItem value="bedtime">Bedtime</SelectItem>
                        <SelectItem value="fasting">Fasting</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={glucoseForm.control}
                name="note"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Notes (optional)</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Add any additional notes about this reading"
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setGlucoseDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={addGlucoseReadingMutation.isPending}
                >
                  {addGlucoseReadingMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Save Reading
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Generate Meal Plan Dialog */}
      <Dialog open={mealPlanDialogOpen} onOpenChange={setMealPlanDialogOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Meal Plan</DialogTitle>
            <DialogDescription>
              Choose the type of meal to generate a diabetes-friendly meal plan.
            </DialogDescription>
          </DialogHeader>
          <Form {...mealPlanForm}>
            <form onSubmit={mealPlanForm.handleSubmit(onMealPlanSubmit)} className="space-y-4">
              <FormField
                control={mealPlanForm.control}
                name="mealType"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Meal Type</FormLabel>
                    <Select
                      onValueChange={field.onChange}
                      defaultValue={field.value}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a meal type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="breakfast">Breakfast</SelectItem>
                        <SelectItem value="lunch">Lunch</SelectItem>
                        <SelectItem value="dinner">Dinner</SelectItem>
                        <SelectItem value="snack">Snack</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setMealPlanDialogOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={generateMealPlanMutation.isPending}
                >
                  {generateMealPlanMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Generate Meal Plan
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
