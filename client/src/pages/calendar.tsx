import { DashboardLayout } from "@/components/layout/dashboard-layout";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { useToast } from "@/hooks/use-toast";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { GlucoseReading, Note } from "@shared/schema";
import { useQuery } from "@tanstack/react-query";
import { ReadingLabel } from "@/components/ui/reading-label";
import { addDays, format, isSameDay, startOfMonth, subMonths } from "date-fns";
import { useState } from "react";
import { CalendarX, ChevronLeft, ChevronRight, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";

type CalendarDay = {
  date: Date;
  glucoseReadings: GlucoseReading[];
  notes: Note[];
  isCurrentMonth: boolean;
};

export default function CalendarPage() {
  const { toast } = useToast();
  const [selectedDate, setSelectedDate] = useState<Date>(new Date());
  const [currentMonth, setCurrentMonth] = useState<Date>(new Date());
  
  // Fetch glucose readings and notes
  const { data: glucoseReadings, isLoading: isLoadingGlucose } = useQuery({
    queryKey: ['/api/glucose'],
    refetchInterval: false,
  });

  const { data: notes, isLoading: isLoadingNotes } = useQuery({
    queryKey: ['/api/notes'],
    refetchInterval: false,
  });

  const isLoading = isLoadingGlucose || isLoadingNotes;

  // Filter data for selected date
  const selectedDateGlucoseReadings = glucoseReadings
    ? glucoseReadings.filter((reading: GlucoseReading) => 
        isSameDay(new Date(reading.timestamp), selectedDate)
      ).sort((a: GlucoseReading, b: GlucoseReading) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    : [];

  const selectedDateNotes = notes
    ? notes.filter((note: Note) => 
        isSameDay(new Date(note.timestamp), selectedDate)
      ).sort((a: Note, b: Note) => 
        new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      )
    : [];

  // Helper to determine if a date has data
  const hasDataForDate = (date: Date) => {
    if (!glucoseReadings && !notes) return false;
    
    const hasGlucose = glucoseReadings?.some((reading: GlucoseReading) => 
      isSameDay(new Date(reading.timestamp), date)
    );
    
    const hasNotes = notes?.some((note: Note) => 
      isSameDay(new Date(note.timestamp), date)
    );
    
    return hasGlucose || hasNotes;
  };

  // Format reading type for display
  const formatReadingType = (type: string) => {
    return type.split("_").map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(" ");
  };

  // Navigate between months
  const goToPreviousMonth = () => {
    setCurrentMonth(prev => subMonths(prev, 1));
  };

  const goToNextMonth = () => {
    setCurrentMonth(prev => addDays(startOfMonth(prev), 32));
  };

  return (
    <DashboardLayout>
      <div className="p-4 sm:p-6 lg:p-8">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-8 gap-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Calendar</h1>
            <p className="text-gray-600">View your glucose readings and notes by date</p>
          </div>
          <div className="flex items-center space-x-2">
            <Button variant="outline" size="icon" onClick={goToPreviousMonth}>
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <span className="text-sm font-medium">
              {format(currentMonth, "MMMM yyyy")}
            </span>
            <Button variant="outline" size="icon" onClick={goToNextMonth}>
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Card className="md:col-span-2">
            <CardHeader>
              <CardTitle>Glucose and Notes Calendar</CardTitle>
              <CardDescription>Select a date to view your glucose readings and notes</CardDescription>
            </CardHeader>
            <CardContent className="p-0">
              {isLoading ? (
                <div className="flex justify-center items-center h-[400px]">
                  <Loader2 className="h-8 w-8 animate-spin text-primary" />
                </div>
              ) : (
                <Calendar
                  mode="single"
                  selected={selectedDate}
                  onSelect={(date) => date && setSelectedDate(date)}
                  month={currentMonth}
                  onMonthChange={setCurrentMonth}
                  className="rounded-md border mx-auto"
                  components={{
                    Day: ({ day, ...props }) => {
                      const hasData = hasDataForDate(day);
                      return (
                        <button
                          {...props}
                          className={cn(
                            props.className,
                            "relative",
                            hasData && "font-bold"
                          )}
                        >
                          {format(day, "d")}
                          {hasData && (
                            <div className="absolute bottom-1 left-1/2 transform -translate-x-1/2">
                              <div className="h-1 w-1 rounded-full bg-primary"></div>
                            </div>
                          )}
                        </button>
                      );
                    },
                  }}
                />
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="pb-3">
              <CardTitle>
                {format(selectedDate, "MMMM d, yyyy")}
              </CardTitle>
              <CardDescription>
                Readings and notes for this date
              </CardDescription>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-6">
                  {/* Glucose Readings for selected date */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center">
                      <CalendarX className="h-4 w-4 mr-2 text-primary" />
                      Glucose Readings
                    </h3>
                    {selectedDateGlucoseReadings.length > 0 ? (
                      <ScrollArea className="h-[120px]">
                        <div className="space-y-2">
                          {selectedDateGlucoseReadings.map((reading: GlucoseReading) => (
                            <div key={reading.id} className="flex items-center space-x-3 p-2 rounded-md bg-gray-50">
                              <ReadingLabel value={reading.value} withText={false} size="sm" />
                              <div>
                                <div className="text-sm font-medium">{reading.value} mg/dL</div>
                                <div className="text-xs text-gray-500">
                                  {format(new Date(reading.timestamp), "h:mm a")} • {formatReadingType(reading.type)}
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">No glucose readings for this date.</div>
                    )}
                  </div>

                  {/* Notes for selected date */}
                  <div>
                    <h3 className="text-sm font-medium mb-3 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2 text-primary" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                      </svg>
                      Notes
                    </h3>
                    {selectedDateNotes.length > 0 ? (
                      <ScrollArea className="h-[180px]">
                        <div className="space-y-2">
                          {selectedDateNotes.map((note: Note) => (
                            <div key={note.id} className="p-2 rounded-md bg-gray-50">
                              <div className="flex items-center justify-between mb-1">
                                <span className="text-sm font-medium">{note.title}</span>
                                <span className="text-xs text-gray-500">{format(new Date(note.timestamp), "h:mm a")}</span>
                              </div>
                              <p className="text-xs text-gray-700 mb-1">{note.content}</p>
                              {note.category && (
                                <Badge variant="outline" className="text-xs">
                                  {note.category}
                                </Badge>
                              )}
                            </div>
                          ))}
                        </div>
                      </ScrollArea>
                    ) : (
                      <div className="text-sm text-gray-500 p-2">No notes for this date.</div>
                    )}
                  </div>

                  <div className="pt-2 flex justify-end">
                    <div className="space-x-2">
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // This would be implemented to navigate to the glucose log page
                          toast({
                            title: "Add Glucose Reading",
                            description: "Navigate to the Glucose Log page to add a reading.",
                          });
                        }}
                      >
                        Add Reading
                      </Button>
                      <Button 
                        variant="outline" 
                        size="sm"
                        onClick={() => {
                          // This would be implemented to navigate to the notes page
                          toast({
                            title: "Add Note",
                            description: "Navigate to the Daily Notes page to add a note.",
                          });
                        }}
                      >
                        Add Note
                      </Button>
                    </div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>

        {/* Daily Summary Section */}
        <div className="mt-8">
          <h2 className="text-xl font-semibold text-gray-900 mb-4">Daily Summary: {format(selectedDate, "MMMM d, yyyy")}</h2>
          
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>Glucose Trends</CardTitle>
                <CardDescription>Overview of your glucose levels for the selected date</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : selectedDateGlucoseReadings.length > 0 ? (
                  <div className="space-y-6">
                    <div className="grid grid-cols-3 gap-4">
                      <div className="bg-gray-50 p-3 rounded-md text-center">
                        <div className="text-sm text-gray-500 mb-1">Readings</div>
                        <div className="text-xl font-bold">{selectedDateGlucoseReadings.length}</div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md text-center">
                        <div className="text-sm text-gray-500 mb-1">Average</div>
                        <div className="text-xl font-bold">
                          {Math.round(
                            selectedDateGlucoseReadings.reduce((sum, reading) => sum + reading.value, 0) / 
                            selectedDateGlucoseReadings.length
                          )} mg/dL
                        </div>
                      </div>
                      <div className="bg-gray-50 p-3 rounded-md text-center">
                        <div className="text-sm text-gray-500 mb-1">Range</div>
                        <div className="text-xl font-bold">
                          {Math.min(...selectedDateGlucoseReadings.map(r => r.value))} - {Math.max(...selectedDateGlucoseReadings.map(r => r.value))}
                        </div>
                      </div>
                    </div>
                    
                    <div>
                      <h3 className="text-sm font-medium mb-2">Readings Timeline</h3>
                      <div className="relative">
                        <div className="absolute top-0 bottom-0 left-4 w-0.5 bg-gray-200"></div>
                        <div className="space-y-3">
                          {selectedDateGlucoseReadings.map((reading, index) => (
                            <div key={reading.id} className="flex items-center relative">
                              <div 
                                className="z-10 w-8 h-8 rounded-full flex items-center justify-center mr-3"
                                style={{
                                  backgroundColor: 
                                    reading.value < 70 ? '#DBEAFE' : 
                                    reading.value <= 140 ? '#D1FAE5' : 
                                    reading.value <= 180 ? '#FEF3C7' : '#FEE2E2',
                                  color: 
                                    reading.value < 70 ? '#2563EB' : 
                                    reading.value <= 140 ? '#059669' : 
                                    reading.value <= 180 ? '#D97706' : '#DC2626',
                                }}
                              >
                                <span className="text-sm font-semibold">{reading.value}</span>
                              </div>
                              <div>
                                <div className="text-sm font-medium">{formatReadingType(reading.type)}</div>
                                <div className="text-xs text-gray-500">{format(new Date(reading.timestamp), "h:mm a")}</div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No glucose readings found for this date
                  </div>
                )}
              </CardContent>
            </Card>
            
            <Card>
              <CardHeader>
                <CardTitle>Daily Notes</CardTitle>
                <CardDescription>Your notes and observations for the selected date</CardDescription>
              </CardHeader>
              <CardContent>
                {isLoading ? (
                  <div className="flex justify-center py-6">
                    <Loader2 className="h-6 w-6 animate-spin text-primary" />
                  </div>
                ) : selectedDateNotes.length > 0 ? (
                  <div className="space-y-4">
                    {selectedDateNotes.map((note) => (
                      <div key={note.id} className="p-4 bg-gray-50 rounded-md">
                        <div className="flex items-center justify-between mb-2">
                          <h3 className="text-sm font-medium">{note.title}</h3>
                          <span className="text-xs text-gray-500">{format(new Date(note.timestamp), "h:mm a")}</span>
                        </div>
                        <p className="text-sm text-gray-700 mb-3">{note.content}</p>
                        {note.category && (
                          <Badge className="text-xs">{note.category}</Badge>
                        )}
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12 text-gray-500">
                    No notes found for this date
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
