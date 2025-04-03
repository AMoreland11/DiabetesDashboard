import { 
  LineChart, 
  Line, 
  XAxis, 
  YAxis, 
  CartesianGrid, 
  Tooltip, 
  ResponsiveContainer,
  ReferenceLine,
  Legend
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { format } from 'date-fns';
import { GlucoseReading } from '@shared/schema';

interface GlucoseChartProps {
  data: GlucoseReading[];
  timeRange?: '7days' | '30days' | 'custom';
}

export function GlucoseChart({ data, timeRange = '7days' }: GlucoseChartProps) {
  // Format data for the chart
  const chartData = data.map(reading => ({
    time: format(new Date(reading.timestamp), 'MMM dd, hh:mm a'),
    date: new Date(reading.timestamp),
    value: reading.value,
    type: reading.type,
  })).sort((a, b) => a.date.getTime() - b.date.getTime());

  // Define target ranges
  const targetLow = 70;
  const targetHigh = 140;
  const dangerLow = 60;
  const dangerHigh = 180;

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white p-3 border border-gray-200 shadow-md rounded-md">
          <p className="font-medium">{label}</p>
          <p className="text-primary">{`Glucose: ${payload[0].value} mg/dL`}</p>
          <p className="text-gray-600 text-sm">{`Type: ${payload[0].payload.type.replace('_', ' ')}`}</p>
        </div>
      );
    }
  
    return null;
  };

  return (
    <Card>
      <CardContent className="p-4">
        <div className="h-64 md:h-80">
          {data.length > 0 ? (
            <ResponsiveContainer width="100%" height="100%">
              <LineChart
                data={chartData}
                margin={{
                  top: 5,
                  right: 30,
                  left: 20,
                  bottom: 5,
                }}
              >
                <CartesianGrid strokeDasharray="3 3" opacity={0.2} />
                <XAxis 
                  dataKey="time" 
                  tick={{ fontSize: 12 }}
                  tickFormatter={(time) => {
                    if (timeRange === '7days') {
                      return format(new Date(time), 'EEE');
                    }
                    return format(new Date(time), 'MM/dd');
                  }}
                />
                <YAxis 
                  domain={[Math.min(50, Math.min(...data.map(d => d.value)) - 10), Math.max(200, Math.max(...data.map(d => d.value)) + 10)]}
                  tick={{ fontSize: 12 }}
                  tickFormatter={(value) => `${value}`}
                  label={{ value: 'mg/dL', angle: -90, position: 'insideLeft', style: { textAnchor: 'middle' } }}
                />
                <Tooltip content={<CustomTooltip />} />
                <Legend verticalAlign="top" height={36} />
                
                {/* Target range */}
                <ReferenceLine y={targetLow} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target Low', position: 'insideBottomLeft', fontSize: 11 }} />
                <ReferenceLine y={targetHigh} stroke="#10b981" strokeDasharray="3 3" label={{ value: 'Target High', position: 'insideTopLeft', fontSize: 11 }} />
                
                {/* Danger lines */}
                <ReferenceLine y={dangerLow} stroke="#ef4444" strokeDasharray="3 3" />
                <ReferenceLine y={dangerHigh} stroke="#ef4444" strokeDasharray="3 3" />
                
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#0070f3"
                  strokeWidth={2}
                  activeDot={{ r: 6 }}
                  dot={{ r: 4 }}
                  name="Glucose Level"
                />
              </LineChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-full">
              <p className="text-gray-500">No glucose data available. Add readings to see your chart.</p>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
