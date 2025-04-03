import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { MealPlan } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { Badge } from "@/components/ui/badge";
import { format } from "date-fns";
import { ChevronRight, Clock, Loader2, Plus, Trash2, Utensils } from "lucide-react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useState } from "react";
import { Textarea } from "@/components/ui/textarea";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";

// Form schema for generating meal plan
const mealPlanFormSchema = z.object({
  mealType: z.enum(["breakfast", "lunch", "dinner", "snack"]),
  allergies: z.string().optional(),
});

export default function MealPlans() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [viewPlanOpen, setViewPlanOpen] = useState(false);
  const [selectedMealPlan, setSelectedMealPlan] = useState<MealPlan | null>(null);
  const [activeTab, setActiveTab] = useState("all");
  
  // Fetch meal plans
  const { data: mealPlans, isLoading } = useQuery({
    queryKey: ['/api/meal-plans'],
    refetchInterval: false,
  });

  const form = useForm<z.infer<typeof mealPlanFormSchema>>({
    resolver: zodResolver(mealPlanFormSchema),
    defaultValues: {
      mealType: "breakfast",
      allergies: "",
    },
  });

  // Generate meal plan mutation
  const generateMealPlanMutation = useMutation({
    mutationFn: async (values: z.infer<typeof mealPlanFormSchema>) => {
      const requestData = {
        mealType: values.mealType,
        allergies: values.allergies ? values.allergies.split(',').map(a => a.trim()) : undefined,
      };
      const response = await apiRequest('POST', '/api/generate-meal-plan', requestData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      setOpen(false);
      form.reset();
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

  // Delete meal plan mutation
  const deleteMealPlanMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/meal-plans/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/meal-plans'] });
      setSelectedMealPlan(null);
      setViewPlanOpen(false);
      toast({
        title: "Success",
        description: "Meal plan deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete meal plan",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof mealPlanFormSchema>) => {
    generateMealPlanMutation.mutate(values);
  };

  // Filter meal plans based on active tab
  const filteredMealPlans = mealPlans
    ? mealPlans.filter((plan: MealPlan) => {
        if (activeTab === "all") return true;
        return plan.mealType === activeTab;
      })
    : [];

  // Format meal type for display
  const formatMealType = (type: string) => {
    return type.charAt(0).toUpperCase() + type.slice(1);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Meal Plans</h1>
            <p className="text-gray-600">AI-generated meal plans designed for diabetes management</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Generate Meal Plan
          </Button>
        </div>

        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-6 grid grid-cols-5">
              <TabsTrigger value="all">All</TabsTrigger>
              <TabsTrigger value="breakfast">Breakfast</TabsTrigger>
              <TabsTrigger value="lunch">Lunch</TabsTrigger>
              <TabsTrigger value="dinner">Dinner</TabsTrigger>
              <TabsTrigger value="snack">Snack</TabsTrigger>
            </TabsList>
            <TabsContent value="all">
              <p className="text-gray-600 mb-4">All meal plans for your diabetes management needs</p>
            </TabsContent>
            <TabsContent value="breakfast">
              <p className="text-gray-600 mb-4">Start your day with these diabetes-friendly breakfast options</p>
            </TabsContent>
            <TabsContent value="lunch">
              <p className="text-gray-600 mb-4">Balanced lunch options to help maintain steady glucose levels</p>
            </TabsContent>
            <TabsContent value="dinner">
              <p className="text-gray-600 mb-4">Dinner recipes that help control your evening glucose levels</p>
            </TabsContent>
            <TabsContent value="snack">
              <p className="text-gray-600 mb-4">Healthy snack options for between meals</p>
            </TabsContent>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredMealPlans.length > 0 ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {filteredMealPlans.map((plan: MealPlan) => (
                <div 
                  key={plan.id} 
                  className="bg-white rounded-lg border border-gray-200 overflow-hidden shadow-sm transition duration-200 hover:shadow-md"
                  onClick={() => {
                    setSelectedMealPlan(plan);
                    setViewPlanOpen(true);
                  }}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="h-48 bg-gray-200 relative">
                    <img src={plan.imageUrl} alt={plan.name} className="w-full h-full object-cover" />
                    <div className="absolute top-2 right-2">
                      <Badge variant="secondary" className="bg-white text-gray-800 hover:bg-white">
                        {formatMealType(plan.mealType)}
                      </Badge>
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-medium text-gray-900 mb-1">{plan.name}</h3>
                    <p className="text-sm text-gray-500 mb-3">{plan.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Clock className="h-4 w-4 mr-1 text-primary" />
                          {plan.prepTime} min
                        </span>
                        <span className="flex items-center">
                          <Utensils className="h-4 w-4 mr-1 text-secondary" />
                          {plan.servings} {plan.servings === 1 ? 'serving' : 'servings'}
                        </span>
                      </div>
                      <span className="text-sm font-medium text-secondary">{plan.carbs}g Carbs</span>
                    </div>
                    <div className="mt-3 flex flex-wrap gap-1">
                      {plan.tags && plan.tags.map((tag: string, i: number) => (
                        <Badge key={i} variant="outline" className="bg-gray-50">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <Utensils className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No meal plans found</h3>
                <p className="text-center text-gray-500 mb-4">
                  Generate your first AI meal plan to get started with diabetes-friendly recipes.
                </p>
                <Button onClick={() => setOpen(true)}>
                  <Plus className="mr-2 h-4 w-4" />
                  Generate Meal Plan
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Generate Meal Plan Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Generate AI Meal Plan</DialogTitle>
            <DialogDescription>
              Choose the type of meal and specify any allergies to generate a personalized plan.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
              <FormField
                control={form.control}
                name="allergies"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergies (Optional)</FormLabel>
                    <FormControl>
                      <Input
                        placeholder="e.g. peanuts, dairy, shellfish (comma separated)"
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
                  onClick={() => setOpen(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={generateMealPlanMutation.isPending}
                >
                  {generateMealPlanMutation.isPending ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>Generate Meal Plan</>
                  )}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* View Meal Plan Dialog */}
      <Dialog open={viewPlanOpen} onOpenChange={setViewPlanOpen}>
        <DialogContent className="max-w-3xl">
          {selectedMealPlan && (
            <>
              <DialogHeader>
                <div className="flex justify-between items-center">
                  <DialogTitle>{selectedMealPlan.name}</DialogTitle>
                  <Badge className="ml-2">{formatMealType(selectedMealPlan.mealType)}</Badge>
                </div>
                <DialogDescription>
                  {selectedMealPlan.description}
                </DialogDescription>
              </DialogHeader>
              
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <div className="aspect-video rounded-md overflow-hidden bg-gray-100 mb-4">
                    <img 
                      src={selectedMealPlan.imageUrl} 
                      alt={selectedMealPlan.name} 
                      className="w-full h-full object-cover"
                    />
                  </div>
                  
                  <div className="grid grid-cols-3 gap-4 mb-4">
                    <div className="bg-gray-50 rounded-md p-3 text-center">
                      <p className="text-sm text-gray-500">Prep Time</p>
                      <p className="font-medium">{selectedMealPlan.prepTime} min</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 text-center">
                      <p className="text-sm text-gray-500">Servings</p>
                      <p className="font-medium">{selectedMealPlan.servings}</p>
                    </div>
                    <div className="bg-gray-50 rounded-md p-3 text-center">
                      <p className="text-sm text-gray-500">Carbs</p>
                      <p className="font-medium">{selectedMealPlan.carbs}g</p>
                    </div>
                  </div>
                  
                  <div className="mb-4">
                    <h3 className="text-lg font-medium mb-2">Tags</h3>
                    <div className="flex flex-wrap gap-2">
                      {selectedMealPlan.tags && selectedMealPlan.tags.map((tag, i) => (
                        <Badge key={i} variant="outline">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div>
                  <Accordion type="single" collapsible defaultValue="ingredients">
                    <AccordionItem value="ingredients">
                      <AccordionTrigger>Ingredients</AccordionTrigger>
                      <AccordionContent>
                        <ul className="space-y-1 list-disc list-inside">
                          {selectedMealPlan.ingredients && selectedMealPlan.ingredients.map((ingredient, i) => (
                            <li key={i} className="text-gray-700">{ingredient}</li>
                          ))}
                        </ul>
                      </AccordionContent>
                    </AccordionItem>
                    
                    <AccordionItem value="instructions">
                      <AccordionTrigger>Instructions</AccordionTrigger>
                      <AccordionContent>
                        <ol className="space-y-2 list-decimal list-inside">
                          {selectedMealPlan.instructions && selectedMealPlan.instructions.map((step, i) => (
                            <li key={i} className="text-gray-700">{step}</li>
                          ))}
                        </ol>
                      </AccordionContent>
                    </AccordionItem>
                  </Accordion>
                </div>
              </div>
              
              <DialogFooter className="flex justify-between items-center gap-2 sm:gap-0">
                <div className="text-sm text-gray-500">
                  Generated on {format(new Date(selectedMealPlan.createdAt), "MMM d, yyyy")}
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={() => setViewPlanOpen(false)}
                  >
                    Close
                  </Button>
                  <Button 
                    variant="destructive"
                    onClick={() => deleteMealPlanMutation.mutate(selectedMealPlan.id)}
                    disabled={deleteMealPlanMutation.isPending}
                  >
                    {deleteMealPlanMutation.isPending ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="h-4 w-4" />
                    )}
                  </Button>
                </div>
              </DialogFooter>
            </>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
