import { PieChart, Pie, Cell, ResponsiveContainer, Legend, Tooltip } from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

interface ChannelData {
  channel: string;
  sessions: number;
  percentage: number;
}

interface ChannelPieChartProps {
  data: ChannelData[];
  year: number;
}

const COLORS = [
  "#5C3D5E",
  "#8B7089", 
  "#4A3049",
  "#7A5478",
  "#9B8499",
  "#3D2B3E",
  "#6B5069",
  "#A494A2",
  "#2D1D2E",
  "#B4A4B2",
];

export function ChannelPieChart({ data, year }: ChannelPieChartProps) {
  if (!data || data.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-lg">Traffic by Channel</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8 text-muted-foreground">
            No channel data available. Configure Google Analytics in Settings.
          </div>
        </CardContent>
      </Card>
    );
  }

  const totalSessions = data.reduce((sum, item) => sum + item.sessions, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg text-[#5C3D5E]">
          Traffic by Channel Group ({year})
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="h-[300px]">
          <ResponsiveContainer width="100%" height="100%">
            <PieChart>
              <Pie
                data={data}
                cx="35%"
                cy="50%"
                labelLine={true}
                outerRadius={80}
                fill="#8884d8"
                dataKey="sessions"
                nameKey="channel"
              >
                {data.map((entry, index) => (
                  <Cell 
                    key={`cell-${index}`} 
                    fill={COLORS[index % COLORS.length]} 
                  />
                ))}
              </Pie>
              <Tooltip
                formatter={(value: number, name: string) => [
                  `${value.toLocaleString()} sessions`,
                  name
                ]}
              />
              <Legend 
                layout="vertical" 
                align="right" 
                verticalAlign="middle"
                formatter={(value, entry: any) => {
                  const item = data.find(d => d.channel === value);
                  return `${value} (${item?.percentage || 0}%)`;
                }}
              />
            </PieChart>
          </ResponsiveContainer>
        </div>
        <div className="mt-4 text-center text-sm text-muted-foreground">
          Total Sessions: {totalSessions.toLocaleString()}
        </div>
      </CardContent>
    </Card>
  );
}
