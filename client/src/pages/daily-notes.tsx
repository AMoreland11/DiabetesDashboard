import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { Note } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { CalendarX, Edit, FileText, Info, Loader2, Plus, Tag, Trash2 } from "lucide-react";
import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

// Form schema for notes
const noteFormSchema = z.object({
  title: z.string().min(1, { message: "Title is required" }),
  content: z.string().min(1, { message: "Content is required" }),
  category: z.string().optional(),
  timestamp: z.date().optional(),
});

export default function DailyNotes() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [editMode, setEditMode] = useState(false);
  const [selectedNote, setSelectedNote] = useState<Note | null>(null);
  
  // Fetch notes
  const { data: notes, isLoading } = useQuery({
    queryKey: ['/api/notes'],
    refetchInterval: false,
  });

  const form = useForm<z.infer<typeof noteFormSchema>>({
    resolver: zodResolver(noteFormSchema),
    defaultValues: {
      title: "",
      content: "",
      category: "General",
      timestamp: new Date(),
    },
  });

  // Set form values when editing a note
  const setFormForEdit = (note: Note) => {
    form.reset({
      title: note.title,
      content: note.content,
      category: note.category || "General",
      timestamp: parseISO(note.timestamp),
    });
    setSelectedNote(note);
    setEditMode(true);
    setOpen(true);
  };

  // Create note mutation
  const createNoteMutation = useMutation({
    mutationFn: async (values: z.infer<typeof noteFormSchema>) => {
      const data = {
        ...values,
        timestamp: values.timestamp?.toISOString() || new Date().toISOString(),
      };
      const response = await apiRequest('POST', '/api/notes', data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setOpen(false);
      form.reset();
      toast({
        title: "Success",
        description: "Note created successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to create note",
        variant: "destructive",
      });
    },
  });

  // Update note mutation
  const updateNoteMutation = useMutation({
    mutationFn: async ({ id, values }: { id: number, values: z.infer<typeof noteFormSchema> }) => {
      const data = {
        ...values,
        timestamp: values.timestamp?.toISOString() || new Date().toISOString(),
      };
      const response = await apiRequest('PUT', `/api/notes/${id}`, data);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setOpen(false);
      setEditMode(false);
      setSelectedNote(null);
      form.reset();
      toast({
        title: "Success",
        description: "Note updated successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update note",
        variant: "destructive",
      });
    },
  });

  // Delete note mutation
  const deleteNoteMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/notes/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/notes'] });
      setSelectedNote(null);
      toast({
        title: "Success",
        description: "Note deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete note",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof noteFormSchema>) => {
    if (editMode && selectedNote) {
      updateNoteMutation.mutate({ id: selectedNote.id, values });
    } else {
      createNoteMutation.mutate(values);
    }
  };

  // Reset form when opening dialog
  const handleOpenChange = (open: boolean) => {
    setOpen(open);
    if (!open) {
      form.reset();
      setEditMode(false);
      setSelectedNote(null);
    }
  };

  // Get unique categories from notes
  const categories = notes
    ? Array.from(new Set(notes.map((note: Note) => note.category).filter(Boolean)))
    : [];

  // Filter notes based on active tab (category)
  const filteredNotes = notes
    ? notes.filter((note: Note) => {
        if (activeTab === "all") return true;
        return note.category === activeTab;
      }).sort((a: Note, b: Note) => {
        return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
      })
    : [];

  // Get note icon based on category
  const getNoteIcon = (category?: string) => {
    switch (category) {
      case "Exercise":
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-blue-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
        </svg>;
      case "Diet":
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-yellow-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
        </svg>;
      case "Medication":
        return <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-green-600" viewBox="0 0 20 20" fill="currentColor">
          <path fillRule="evenodd" d="M6.267 3.455a3.066 3.066 0 001.745-.723 3.066 3.066 0 013.976 0 3.066 3.066 0 001.745.723 3.066 3.066 0 012.812 2.812c.051.643.304 1.254.723 1.745a3.066 3.066 0 010 3.976 3.066 3.066 0 00-.723 1.745 3.066 3.066 0 01-2.812 2.812 3.066 3.066 0 00-1.745.723 3.066 3.066 0 01-3.976 0 3.066 3.066 0 00-1.745-.723 3.066 3.066 0 01-2.812-2.812 3.066 3.066 0 00-.723-1.745 3.066 3.066 0 010-3.976 3.066 3.066 0 00.723-1.745 3.066 3.066 0 012.812-2.812zm7.44 5.252a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
        </svg>;
      default:
        return <Info className="h-4 w-4 text-blue-600" />;
    }
  };

  // Get category color class
  const getCategoryColorClass = (category?: string) => {
    switch (category) {
      case "Exercise":
        return "bg-blue-100";
      case "Diet":
        return "bg-yellow-100";
      case "Medication":
        return "bg-green-100";
      default:
        return "bg-gray-100";
    }
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Daily Notes</h1>
            <p className="text-gray-600">Keep track of important information and observations</p>
          </div>
          <Button onClick={() => {
            form.reset({
              title: "",
              content: "",
              category: "General",
              timestamp: new Date(),
            });
            setOpen(true);
          }}>
            <Plus className="mr-2 h-4 w-4" />
            Add Note
          </Button>
        </div>

        <div className="mb-8">
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="mb-4 w-full flex overflow-x-auto">
              <TabsTrigger value="all" className="flex-1">All Notes</TabsTrigger>
              {categories.map((category: string) => (
                <TabsTrigger key={category} value={category} className="flex-1">
                  {category}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>

          {isLoading ? (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : filteredNotes.length > 0 ? (
            <div className="space-y-4">
              {filteredNotes.map((note: Note) => (
                <Card key={note.id}>
                  <CardContent className="p-4">
                    <div className="flex items-start space-x-3">
                      <div className="flex-shrink-0 mt-1">
                        <div className={`w-8 h-8 rounded-full ${getCategoryColorClass(note.category)} flex items-center justify-center`}>
                          {getNoteIcon(note.category)}
                        </div>
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center justify-between mb-1">
                          <h4 className="text-sm font-medium text-gray-900">{note.title}</h4>
                          <span className="text-xs text-gray-500">
                            {format(new Date(note.timestamp), "MMM d, yyyy h:mm a")}
                          </span>
                        </div>
                        <p className="text-sm text-gray-600 whitespace-pre-line">{note.content}</p>
                        <div className="mt-2 flex justify-between items-center">
                          {note.category ? (
                            <Badge variant="outline" className="text-xs">
                              {note.category}
                            </Badge>
                          ) : (
                            <span></span>
                          )}
                          <div className="flex gap-2">
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => setFormForEdit(note)}
                              className="h-8 w-8"
                            >
                              <Edit className="h-4 w-4 text-primary" />
                            </Button>
                            <Button 
                              variant="ghost" 
                              size="icon" 
                              onClick={() => deleteNoteMutation.mutate(note.id)}
                              className="h-8 w-8"
                              disabled={deleteNoteMutation.isPending}
                            >
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          ) : (
            <Card>
              <CardContent className="flex flex-col items-center justify-center p-6">
                <div className="rounded-full bg-primary/10 p-3 mb-4">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <h3 className="text-lg font-medium mb-2">No notes found</h3>
                <p className="text-center text-gray-500 mb-4">
                  {activeTab === "all" 
                    ? "Add your first note to keep track of important information." 
                    : `No notes found in the ${activeTab} category.`}
                </p>
                <Button onClick={() => {
                  form.reset({
                    title: "",
                    content: "",
                    category: activeTab !== "all" ? activeTab : "General",
                    timestamp: new Date(),
                  });
                  setOpen(true);
                }}>
                  <Plus className="mr-2 h-4 w-4" />
                  Add Note
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Add/Edit Note Dialog */}
      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editMode ? "Edit Note" : "Add Note"}</DialogTitle>
            <DialogDescription>
              {editMode 
                ? "Update your note details below." 
                : "Add a new note to track observations, reminders, or important information."}
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="title"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Title</FormLabel>
                    <FormControl>
                      <Input placeholder="Note title" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="content"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Content</FormLabel>
                    <FormControl>
                      <Textarea 
                        placeholder="Enter your note details here"
                        className="min-h-[120px]"
                        {...field} 
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <FormField
                  control={form.control}
                  name="category"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Category</FormLabel>
                      <Select
                        onValueChange={field.onChange}
                        defaultValue={field.value}
                      >
                        <FormControl>
                          <SelectTrigger>
                            <SelectValue placeholder="Select a category" />
                          </SelectTrigger>
                        </FormControl>
                        <SelectContent>
                          <SelectItem value="General">General</SelectItem>
                          <SelectItem value="Exercise">Exercise</SelectItem>
                          <SelectItem value="Diet">Diet</SelectItem>
                          <SelectItem value="Medication">Medication</SelectItem>
                          <SelectItem value="Symptoms">Symptoms</SelectItem>
                          <SelectItem value="Appointment">Appointment</SelectItem>
                        </SelectContent>
                      </Select>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="timestamp"
                  render={({ field }) => (
                    <FormItem className="flex flex-col">
                      <FormLabel>Date</FormLabel>
                      <Popover>
                        <PopoverTrigger asChild>
                          <FormControl>
                            <Button
                              variant={"outline"}
                              className={cn(
                                "w-full pl-3 text-left font-normal",
                                !field.value && "text-muted-foreground"
                              )}
                            >
                              {field.value ? (
                                format(field.value, "PPP")
                              ) : (
                                <span>Pick a date</span>
                              )}
                              <CalendarX className="ml-auto h-4 w-4 opacity-50" />
                            </Button>
                          </FormControl>
                        </PopoverTrigger>
                        <PopoverContent className="w-auto p-0" align="start">
                          <Calendar
                            mode="single"
                            selected={field.value}
                            onSelect={field.onChange}
                            initialFocus
                          />
                        </PopoverContent>
                      </Popover>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => handleOpenChange(false)}
                >
                  Cancel
                </Button>
                <Button 
                  type="submit"
                  disabled={createNoteMutation.isPending || updateNoteMutation.isPending}
                >
                  {(createNoteMutation.isPending || updateNoteMutation.isPending) && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  {editMode ? "Update Note" : "Save Note"}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
