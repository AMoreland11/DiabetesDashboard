import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/lib/auth";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormDescription, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Textarea } from "@/components/ui/textarea";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useMutation } from "@tanstack/react-query";
import { AlertTriangle, Check, Loader2, Plus, Save, X } from "lucide-react";
import { useState } from "react";

const profileFormSchema = z.object({
  name: z.string().optional(),
  email: z.string().email({
    message: "Please enter a valid email address.",
  }),
  newPassword: z.string().min(6, {
    message: "Password must be at least 6 characters.",
  }).optional(),
  confirmPassword: z.string().optional(),
}).refine(data => {
  if (data.newPassword && !data.confirmPassword) {
    return false;
  }
  if (!data.newPassword && data.confirmPassword) {
    return false;
  }
  if (data.newPassword && data.confirmPassword && data.newPassword !== data.confirmPassword) {
    return false;
  }
  return true;
}, {
  message: "Passwords don't match",
  path: ["confirmPassword"],
});

const allergiesFormSchema = z.object({
  allergy: z.string().min(1, {
    message: "Please enter an allergy.",
  }),
});

export default function AccountSettings() {
  const { toast } = useToast();
  const { user, logout } = useAuth();
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);
  const [showPasswordFields, setShowPasswordFields] = useState(false);
  const [allergies, setAllergies] = useState<string[]>(user?.allergies || []);
  const [addAllergyOpen, setAddAllergyOpen] = useState(false);

  const profileForm = useForm<z.infer<typeof profileFormSchema>>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: {
      name: user?.name || "",
      email: user?.email || "",
      newPassword: "",
      confirmPassword: "",
    },
  });

  const allergyForm = useForm<z.infer<typeof allergiesFormSchema>>({
    resolver: zodResolver(allergiesFormSchema),
    defaultValues: {
      allergy: "",
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (values: z.infer<typeof profileFormSchema>) => {
      const { confirmPassword, ...updateData } = values;
      
      // Omit empty password fields
      if (!updateData.newPassword) {
        delete updateData.newPassword;
      }
      
      const response = await apiRequest('PUT', `/api/auth/update-profile`, updateData);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/current-user'] });
      toast({
        title: "Profile updated",
        description: "Your profile has been updated successfully",
      });
      profileForm.reset({
        name: user?.name,
        email: user?.email,
        newPassword: "",
        confirmPassword: "",
      });
      setShowPasswordFields(false);
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update profile",
        variant: "destructive",
      });
    },
  });

  const updateAllergiesMutation = useMutation({
    mutationFn: async (allergies: string[]) => {
      const response = await apiRequest('PUT', `/api/auth/update-allergies`, { allergies });
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/auth/current-user'] });
      toast({
        title: "Allergies updated",
        description: "Your allergies have been updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update allergies",
        variant: "destructive",
      });
    },
  });

  const onProfileSubmit = (values: z.infer<typeof profileFormSchema>) => {
    updateProfileMutation.mutate(values);
  };

  const onAddAllergy = (values: z.infer<typeof allergiesFormSchema>) => {
    if (!allergies.includes(values.allergy)) {
      const newAllergies = [...allergies, values.allergy];
      setAllergies(newAllergies);
      updateAllergiesMutation.mutate(newAllergies);
      allergyForm.reset();
      setAddAllergyOpen(false);
    } else {
      toast({
        title: "Allergy already exists",
        description: "This allergy is already in your list",
        variant: "destructive",
      });
    }
  };

  const removeAllergy = (allergy: string) => {
    const newAllergies = allergies.filter(a => a !== allergy);
    setAllergies(newAllergies);
    updateAllergiesMutation.mutate(newAllergies);
  };

  const deleteAccount = () => {
    // This would be implemented to delete the account
    toast({
      title: "Account Deletion",
      description: "This feature is not implemented in the demo version.",
    });
    setShowDeleteDialog(false);
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-gray-900">Account Settings</h1>
          <p className="text-gray-600">Manage your account preferences and personal information</p>
        </div>

        <Tabs defaultValue="profile" className="space-y-8">
          <TabsList>
            <TabsTrigger value="profile">Profile</TabsTrigger>
            <TabsTrigger value="allergies">Allergies</TabsTrigger>
            <TabsTrigger value="notifications">Notifications</TabsTrigger>
            <TabsTrigger value="danger">Danger Zone</TabsTrigger>
          </TabsList>

          <TabsContent value="profile">
            <Card>
              <CardHeader>
                <CardTitle>Profile Information</CardTitle>
                <CardDescription>
                  Update your profile information and email address
                </CardDescription>
              </CardHeader>
              <Form {...profileForm}>
                <form onSubmit={profileForm.handleSubmit(onProfileSubmit)}>
                  <CardContent className="space-y-6">
                    <FormField
                      control={profileForm.control}
                      name="name"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="Your name" {...field} />
                          </FormControl>
                          <FormDescription>
                            This is your public display name.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    
                    <FormField
                      control={profileForm.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel>Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="you@example.com" {...field} />
                          </FormControl>
                          <FormDescription>
                            Your email address is used for notifications and login.
                          </FormDescription>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <div>
                      <div className="flex items-center justify-between mb-4">
                        <div className="text-sm font-medium">Password</div>
                        <Button 
                          variant="outline" 
                          size="sm" 
                          type="button"
                          onClick={() => setShowPasswordFields(!showPasswordFields)}
                        >
                          {showPasswordFields ? "Cancel" : "Change Password"}
                        </Button>
                      </div>

                      {showPasswordFields && (
                        <div className="space-y-4">
                          <FormField
                            control={profileForm.control}
                            name="newPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="New password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                          
                          <FormField
                            control={profileForm.control}
                            name="confirmPassword"
                            render={({ field }) => (
                              <FormItem>
                                <FormLabel>Confirm New Password</FormLabel>
                                <FormControl>
                                  <Input type="password" placeholder="Confirm your new password" {...field} />
                                </FormControl>
                                <FormMessage />
                              </FormItem>
                            )}
                          />
                        </div>
                      )}
                    </div>
                  </CardContent>
                  <CardFooter>
                    <Button 
                      type="submit"
                      disabled={updateProfileMutation.isPending}
                    >
                      {updateProfileMutation.isPending && (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      )}
                      Save Changes
                    </Button>
                  </CardFooter>
                </form>
              </Form>
            </Card>

            <Card className="mt-6">
              <CardHeader>
                <CardTitle>Account Information</CardTitle>
                <CardDescription>
                  View your account details and usage information
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-sm text-gray-500">Username</Label>
                    <div className="text-sm font-medium mt-1">{user?.username}</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Account Type</Label>
                    <div className="text-sm font-medium mt-1">Standard</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Registered Since</Label>
                    <div className="text-sm font-medium mt-1">May 2023</div>
                  </div>
                  <div>
                    <Label className="text-sm text-gray-500">Last Login</Label>
                    <div className="text-sm font-medium mt-1">Today</div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="allergies">
            <Card>
              <CardHeader>
                <CardTitle>Food Allergies</CardTitle>
                <CardDescription>
                  Manage your food allergies to customize meal plan recommendations
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div>
                  <Label className="text-sm font-medium">Your Allergies</Label>
                  <div className="mt-2">
                    {allergies.length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {allergies.map((allergy, index) => (
                          <Badge key={index} variant="secondary" className="pl-2 pr-1 py-1 flex items-center gap-1">
                            {allergy}
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              className="h-4 w-4 ml-1 rounded-full hover:bg-red-100" 
                              onClick={() => removeAllergy(allergy)}
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </Badge>
                        ))}
                      </div>
                    ) : (
                      <div className="text-sm text-gray-500">No allergies added yet.</div>
                    )}
                  </div>
                </div>

                <div>
                  <Button 
                    variant="outline" 
                    onClick={() => setAddAllergyOpen(true)}
                    disabled={updateAllergiesMutation.isPending}
                    className="mt-2"
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add Allergy
                  </Button>
                </div>

                <Separator />

                <div>
                  <h3 className="text-sm font-medium mb-2">How this affects your meal plans</h3>
                  <p className="text-sm text-gray-600 mb-4">
                    When generating meal plans, the AI will avoid including ingredients you're allergic to.
                    This helps ensure all recommended meals are safe for you to eat.
                  </p>
                  <div className="flex items-start space-x-2 p-3 bg-blue-50 text-blue-800 rounded-md">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <div className="text-sm flex-1">
                      <p className="font-medium mb-1">Important Note</p>
                      <p>
                        While we do our best to filter out allergens, always double-check ingredient lists
                        before preparing meals, especially if you have severe allergies.
                      </p>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="notifications">
            <Card>
              <CardHeader>
                <CardTitle>Notification Settings</CardTitle>
                <CardDescription>
                  Customize how and when you receive notifications
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Email Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="glucose-alerts" className="text-sm">Glucose Alerts</Label>
                      <p className="text-sm text-gray-500">Receive alerts when your glucose levels are out of range</p>
                    </div>
                    <Switch id="glucose-alerts" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="weekly-summary" className="text-sm">Weekly Summary</Label>
                      <p className="text-sm text-gray-500">Get a weekly summary of your glucose trends</p>
                    </div>
                    <Switch id="weekly-summary" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="meal-reminders" className="text-sm">Meal Reminders</Label>
                      <p className="text-sm text-gray-500">Reminders to log your meals and check glucose</p>
                    </div>
                    <Switch id="meal-reminders" />
                  </div>
                  
                  <Separator />
                  
                  <h3 className="text-sm font-medium">App Notifications</h3>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="app-alerts" className="text-sm">In-App Alerts</Label>
                      <p className="text-sm text-gray-500">Notifications within the application</p>
                    </div>
                    <Switch id="app-alerts" defaultChecked />
                  </div>
                  
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="new-features" className="text-sm">New Features & Updates</Label>
                      <p className="text-sm text-gray-500">Be notified about new app features and updates</p>
                    </div>
                    <Switch id="new-features" defaultChecked />
                  </div>
                </div>
              </CardContent>
              <CardFooter>
                <Button onClick={() => {
                  toast({
                    title: "Notifications Saved",
                    description: "Your notification preferences have been updated",
                  });
                }}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Preferences
                </Button>
              </CardFooter>
            </Card>
          </TabsContent>

          <TabsContent value="danger">
            <Card>
              <CardHeader>
                <CardTitle className="text-red-600">Danger Zone</CardTitle>
                <CardDescription>
                  Actions here can permanently affect your account
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="rounded-md border border-red-200 bg-red-50 p-4">
                  <div className="flex items-start">
                    <AlertTriangle className="h-5 w-5 text-red-600 mr-3 mt-0.5" />
                    <div>
                      <h3 className="text-sm font-medium text-red-800">Delete Account</h3>
                      <p className="text-sm text-red-700 mt-1">
                        Once you delete your account, there is no going back. All your data will be permanently removed.
                        This action cannot be undone.
                      </p>
                      <Button 
                        variant="destructive" 
                        className="mt-4" 
                        onClick={() => setShowDeleteDialog(true)}
                      >
                        Delete Account
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-amber-500 mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM4.332 8.027a6.012 6.012 0 011.912-2.706C6.512 5.73 6.974 6 7.5 6A1.5 1.5 0 019 7.5V8a2 2 0 004 0 2 2 0 011.523-1.943A5.977 5.977 0 0116 10c0 .34-.028.675-.083 1H15a2 2 0 00-2 2v2.197A5.973 5.973 0 0110 16v-2a2 2 0 00-2-2 2 2 0 01-2-2 2 2 0 00-1.668-1.973z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium">Export Your Data</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Download a copy of all your glucose readings, meal plans, and notes.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4" 
                        onClick={() => {
                          toast({
                            title: "Data Export",
                            description: "Your data export is being prepared and will be emailed to you.",
                          });
                        }}
                      >
                        Export Data
                      </Button>
                    </div>
                  </div>
                </div>

                <div className="rounded-md border p-4">
                  <div className="flex items-start">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-500 mr-3 mt-0.5" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
                    </svg>
                    <div>
                      <h3 className="text-sm font-medium">Sign Out Everywhere</h3>
                      <p className="text-sm text-gray-600 mt-1">
                        Sign out from all devices where you're currently logged in.
                      </p>
                      <Button 
                        variant="outline" 
                        className="mt-4" 
                        onClick={() => {
                          toast({
                            title: "Signed Out",
                            description: "You've been signed out from all devices",
                          });
                          // In a real app, this would sign out all sessions before the final logout
                          setTimeout(() => {
                            logout();
                          }, 1500);
                        }}
                      >
                        Sign Out Everywhere
                      </Button>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      </div>

      {/* Add Allergy Dialog */}
      <Dialog open={addAllergyOpen} onOpenChange={setAddAllergyOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Food Allergy</DialogTitle>
            <DialogDescription>
              Add an allergy to customize your meal plan recommendations
            </DialogDescription>
          </DialogHeader>
          <Form {...allergyForm}>
            <form onSubmit={allergyForm.handleSubmit(onAddAllergy)} className="space-y-4">
              <FormField
                control={allergyForm.control}
                name="allergy"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Allergy</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. peanuts, dairy, shellfish" {...field} />
                    </FormControl>
                    <FormDescription>
                      Enter one allergy at a time. You can add more later.
                    </FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setAddAllergyOpen(false)}
                >
                  Cancel
                </Button>
                <Button type="submit">
                  <Check className="mr-2 h-4 w-4" />
                  Add Allergy
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>

      {/* Delete Account Confirmation Dialog */}
      <Dialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="text-red-600">Delete Account</DialogTitle>
            <DialogDescription>
              This action cannot be undone. Are you sure you want to permanently delete your account?
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            <div className="border border-red-200 bg-red-50 p-4 rounded-md">
              <p className="text-sm text-red-800">
                When you delete your account:
              </p>
              <ul className="text-sm text-red-700 mt-2 space-y-1 list-disc list-inside">
                <li>All your glucose readings will be permanently deleted</li>
                <li>All your meal plans will be permanently deleted</li>
                <li>All your notes will be permanently deleted</li>
                <li>You won't be able to recover this information later</li>
              </ul>
            </div>
            <DialogFooter>
              <Button
                variant="outline"
                onClick={() => setShowDeleteDialog(false)}
              >
                Cancel
              </Button>
              <Button
                variant="destructive"
                onClick={deleteAccount}
              >
                Delete Permanently
              </Button>
            </DialogFooter>
          </div>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
