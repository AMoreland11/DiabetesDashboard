import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GlucoseReading } from "@shared/schema";
import { useQuery, useMutation } from "@tanstack/react-query";
import { format, subDays, isWithinInterval } from "date-fns";
import { CalendarX, Filter, Loader2, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { GlucoseChart } from "@/components/ui/glucose-chart";
import { ReadingLabel } from "@/components/ui/reading-label";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Calendar } from "@/components/ui/calendar";
import { cn } from "@/lib/utils";

// Form schema for glucose reading
const glucoseFormSchema = z.object({
  value: z.coerce.number().min(20).max(600),
  type: z.string().min(1),
  note: z.string().optional(),
  timestamp: z.string().optional(),
});

export default function GlucoseLog() {
  const { toast } = useToast();
  const [open, setOpen] = useState(false);
  const [activeTab, setActiveTab] = useState("all");
  const [dateRange, setDateRange] = useState<{
    from: Date | undefined;
    to: Date | undefined;
  }>({
    from: subDays(new Date(), 30),
    to: new Date(),
  });
  const [selectedReading, setSelectedReading] = useState<GlucoseReading | null>(null);

  // Fetch glucose readings
  const { data: readings, isLoading } = useQuery({
    queryKey: ['/api/glucose'],
    refetchInterval: false,
  });

  const form = useForm<z.infer<typeof glucoseFormSchema>>({
    resolver: zodResolver(glucoseFormSchema),
    defaultValues: {
      value: undefined,
      type: "before_breakfast",
      note: "",
      timestamp: new Date().toISOString(),
    },
  });

  const deleteForm = useForm({
    defaultValues: {
      id: "",
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
      setOpen(false);
      form.reset();
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

  const deleteGlucoseReadingMutation = useMutation({
    mutationFn: async (id: number) => {
      const response = await apiRequest('DELETE', `/api/glucose/${id}`, undefined);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['/api/glucose'] });
      setSelectedReading(null);
      toast({
        title: "Success",
        description: "Glucose reading deleted successfully",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to delete glucose reading",
        variant: "destructive",
      });
    },
  });

  const onSubmit = (values: z.infer<typeof glucoseFormSchema>) => {
    addGlucoseReadingMutation.mutate(values);
  };

  // Filter readings based on active tab and date range
  const filteredReadings = readings
    ? readings
        .filter((reading: GlucoseReading) => {
          const readingDate = new Date(reading.timestamp);
          const withinDateRange = dateRange.from && dateRange.to
            ? isWithinInterval(readingDate, { start: dateRange.from, end: dateRange.to })
            : true;

          if (!withinDateRange) return false;

          if (activeTab === "all") return true;
          if (activeTab === "low" && reading.value < 70) return true;
          if (activeTab === "normal" && reading.value >= 70 && reading.value <= 140) return true;
          if (activeTab === "elevated" && reading.value > 140 && reading.value <= 180) return true;
          if (activeTab === "high" && reading.value > 180) return true;
          return false;
        })
        .sort((a: GlucoseReading, b: GlucoseReading) => {
          return new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime();
        })
    : [];

  // Calculate stats
  const calculateStats = (data: GlucoseReading[]) => {
    if (!data || data.length === 0) {
      return {
        total: 0,
        average: 0,
        highest: 0,
        lowest: 0,
        inRange: 0,
        inRangePercentage: 0,
      };
    }

    const total = data.length;
    const sum = data.reduce((acc, reading) => acc + reading.value, 0);
    const average = Math.round(sum / total);
    
    const sorted = [...data].sort((a, b) => b.value - a.value);
    const highest = sorted[0].value;
    const lowest = sorted[sorted.length - 1].value;
    
    const inRange = data.filter(r => r.value >= 70 && r.value <= 140).length;
    const inRangePercentage = Math.round((inRange / total) * 100);

    return {
      total,
      average,
      highest,
      lowest,
      inRange,
      inRangePercentage,
    };
  };

  const stats = calculateStats(filteredReadings);

  // Reading type display helper
  const formatReadingType = (type: string) => {
    return type.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Glucose Log</h1>
            <p className="text-gray-600">Track and monitor your glucose readings over time</p>
          </div>
          <Button onClick={() => setOpen(true)}>
            <Plus className="mr-2 h-4 w-4" />
            Add Reading
          </Button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Total Readings</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.total}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Average Level</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.average > 0 ? `${stats.average} mg/dL` : 'N/A'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">Highest Reading</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.highest > 0 ? `${stats.highest} mg/dL` : 'N/A'}</div>
            </CardContent>
          </Card>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm text-gray-500">In Target Range</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{stats.inRangePercentage > 0 ? `${stats.inRangePercentage}%` : 'N/A'}</div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-8">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Glucose Trend</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredReadings.length > 0 ? (
                <GlucoseChart data={filteredReadings} />
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No data available for the selected filters.
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex items-center justify-center h-64">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : filteredReadings.length > 0 ? (
                <div className="space-y-4">
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Low (&lt;70)</span>
                      <span className="text-sm font-medium">
                        {filteredReadings.filter(r => r.value < 70).length} readings
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-blue-500 rounded-full" 
                        style={{ 
                          width: `${(filteredReadings.filter(r => r.value < 70).length / filteredReadings.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Normal (70-140)</span>
                      <span className="text-sm font-medium">
                        {filteredReadings.filter(r => r.value >= 70 && r.value <= 140).length} readings
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-green-500 rounded-full"
                        style={{ 
                          width: `${(filteredReadings.filter(r => r.value >= 70 && r.value <= 140).length / filteredReadings.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">Elevated (141-180)</span>
                      <span className="text-sm font-medium">
                        {filteredReadings.filter(r => r.value > 140 && r.value <= 180).length} readings
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-yellow-500 rounded-full"
                        style={{ 
                          width: `${(filteredReadings.filter(r => r.value > 140 && r.value <= 180).length / filteredReadings.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                  
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-gray-500">High (&gt;180)</span>
                      <span className="text-sm font-medium">
                        {filteredReadings.filter(r => r.value > 180).length} readings
                      </span>
                    </div>
                    <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
                      <div 
                        className="h-full bg-red-500 rounded-full"
                        style={{ 
                          width: `${(filteredReadings.filter(r => r.value > 180).length / filteredReadings.length) * 100}%` 
                        }}
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex items-center justify-center h-64 text-gray-500">
                  No data available for the selected filters.
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Readings Table */}
        <Card>
          <CardHeader>
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
              <CardTitle>Glucose Readings</CardTitle>
              <div className="flex flex-col sm:flex-row gap-2">
                <Popover>
                  <PopoverTrigger asChild>
                    <Button variant="outline" className="flex items-center">
                      <CalendarX className="mr-2 h-4 w-4" />
                      {dateRange.from ? (
                        dateRange.to ? (
                          <>
                            {format(dateRange.from, "LLL dd, y")} - {format(dateRange.to, "LLL dd, y")}
                          </>
                        ) : (
                          format(dateRange.from, "LLL dd, y")
                        )
                      ) : (
                        "Pick a date range"
                      )}
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent className="w-auto p-0" align="end">
                    <Calendar
                      initialFocus
                      mode="range"
                      defaultMonth={dateRange.from}
                      selected={{ from: dateRange.from, to: dateRange.to }}
                      onSelect={(range) => {
                        setDateRange({
                          from: range?.from,
                          to: range?.to,
                        });
                      }}
                      numberOfMonths={2}
                    />
                  </PopoverContent>
                </Popover>

                <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full sm:w-auto">
                  <TabsList className="grid grid-cols-5">
                    <TabsTrigger value="all">All</TabsTrigger>
                    <TabsTrigger value="low">Low</TabsTrigger>
                    <TabsTrigger value="normal">Normal</TabsTrigger>
                    <TabsTrigger value="elevated">Elevated</TabsTrigger>
                    <TabsTrigger value="high">High</TabsTrigger>
                  </TabsList>
                </Tabs>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="flex justify-center py-6">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
              </div>
            ) : filteredReadings.length > 0 ? (
              <div className="rounded-md border">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Value</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Time</TableHead>
                      <TableHead>Type</TableHead>
                      <TableHead>Notes</TableHead>
                      <TableHead className="w-[80px]">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredReadings.map((reading: GlucoseReading) => (
                      <TableRow key={reading.id}>
                        <TableCell className="font-medium">{reading.value} mg/dL</TableCell>
                        <TableCell>
                          <ReadingLabel value={reading.value} />
                        </TableCell>
                        <TableCell>{format(new Date(reading.timestamp), "MMM d, yyyy h:mm a")}</TableCell>
                        <TableCell>{formatReadingType(reading.type)}</TableCell>
                        <TableCell className="max-w-[200px] truncate">
                          {reading.note || "-"}
                        </TableCell>
                        <TableCell>
                          <Button 
                            variant="ghost" 
                            size="icon" 
                            onClick={() => setSelectedReading(reading)}
                          >
                            <Trash2 className="h-4 w-4 text-red-500" />
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            ) : (
              <div className="text-center py-6 text-gray-500">
                No readings found for the selected filters.
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Add Reading Dialog */}
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Add Glucose Reading</DialogTitle>
            <DialogDescription>
              Enter your glucose measurement details below.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
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
                control={form.control}
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
                control={form.control}
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
                  onClick={() => setOpen(false)}
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

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!selectedReading} onOpenChange={(open) => !open && setSelectedReading(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Reading</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete this glucose reading? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          {selectedReading && (
            <div className="space-y-4">
              <div className="border rounded-md p-4">
                <div className="grid grid-cols-2 gap-2">
                  <div className="text-gray-500">Value:</div>
                  <div className="font-medium">{selectedReading.value} mg/dL</div>
                  <div className="text-gray-500">Date:</div>
                  <div className="font-medium">{format(new Date(selectedReading.timestamp), "MMM d, yyyy h:mm a")}</div>
                  <div className="text-gray-500">Type:</div>
                  <div className="font-medium">{formatReadingType(selectedReading.type)}</div>
                </div>
              </div>
              <DialogFooter>
                <Button
                  type="button"
                  variant="outline"
                  onClick={() => setSelectedReading(null)}
                >
                  Cancel
                </Button>
                <Button 
                  variant="destructive"
                  onClick={() => deleteGlucoseReadingMutation.mutate(selectedReading.id)}
                  disabled={deleteGlucoseReadingMutation.isPending}
                >
                  {deleteGlucoseReadingMutation.isPending && (
                    <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  )}
                  Delete
                </Button>
              </DialogFooter>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </DashboardLayout>
  );
}
