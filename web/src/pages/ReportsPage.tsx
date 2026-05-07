import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import {
  Box,
  Card,
  CardContent,
  Typography,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  Alert,
  Divider,
  SelectChangeEvent,
} from '@mui/material';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { format, subMonths, subYears, subDays, isAfter } from 'date-fns';
import { reportsApi } from '../api/reports';
import { parseApiDate } from '../utils/dates';
import { formatNumber } from '../utils/calculations';

type DateRange = 'all' | 'month' | 'year';
type DataType = 'weight' | 'netCalories' | 'weight30avg' | 'calories30avg' | 'steps' | 'steps30avg';

const DATA_TYPE_LABELS: Record<DataType, string> = {
  weight: 'Weight (lbs)',
  netCalories: 'Net Calories per Day',
  steps: 'Steps per Day',
  weight30avg: 'Weight 30-day Moving Avg',
  calories30avg: 'Calories 30-day Moving Avg',
  steps30avg: 'Steps 30-day Moving Avg',
};

const DATA_TYPE_COLORS: Record<DataType, string> = {
  weight: '#FF6600',
  netCalories: '#FCD202',
  steps: '#9C27B0',
  weight30avg: '#2196F3',
  calories30avg: '#4CAF50',
  steps30avg: '#E91E63',
};

export default function ReportsPage() {
  const [dateRange, setDateRange] = useState<DateRange>('month');
  const [leftAxis, setLeftAxis] = useState<DataType>('weight');
  const [rightAxis, setRightAxis] = useState<DataType>('netCalories');

  // Compute the fetch window (display range + 30-day lead-in for moving avg seed)
  // and the display cutoff. Memoized so it doesn't change on every render.
  const today = useMemo(() => new Date(), []);

  const { fetchStart, fetchEnd, displayStart } = useMemo(() => {
    const end = new Date(today);
    end.setHours(23, 59, 59, 999);

    switch (dateRange) {
      case 'month': {
        const ds = subMonths(today, 1);
        return { fetchStart: subDays(ds, 30), fetchEnd: end, displayStart: ds };
      }
      case 'year': {
        const ds = subYears(today, 1);
        return { fetchStart: subDays(ds, 30), fetchEnd: end, displayStart: ds };
      }
      default:
        return { fetchStart: null, fetchEnd: null, displayStart: null };
    }
  }, [dateRange, today]);

  // Fetch report entries — include 30-day lead-in so moving averages are seeded
  // from real history rather than the start of the display window.
  const { data: reportEntries = [], isLoading, error } = useQuery({
    queryKey: ['report-entries', dateRange],
    queryFn: () =>
      reportsApi.getEntries(
        fetchStart && fetchEnd
          ? { startDate: fetchStart.toISOString(), endDate: fetchEnd.toISOString() }
          : undefined,
      ),
  });

  // Calculate 30-day moving averages over the fetched window, then slice off
  // the 30-day lead-in so only the user's selected range is displayed.
  const chartData = useMemo(() => {
    const sorted = [...reportEntries].sort(
      (a, b) => parseApiDate(a.date).getTime() - parseApiDate(b.date).getTime(),
    );

    const withAverages = sorted.map((entry, index, arr) => {
      const start = Math.max(0, index - 29);
      const window = arr.slice(start, index + 1);

      const weight30avg =
        window.reduce((sum, e) => sum + e.pounds, 0) / window.length;
      const calories30avg =
        window.reduce((sum, e) => sum + e.netCalories, 0) / window.length;
      const steps30avg =
        window.reduce((sum, e) => sum + (e.steps ?? 0), 0) / window.length;

      return {
        ...entry,
        date: format(parseApiDate(entry.date), 'MMM d, yyyy'),
        dateObj: parseApiDate(entry.date),
        weight: entry.pounds,
        steps: entry.steps ?? 0,
        weight30avg: window.length >= 7 ? weight30avg : null,
        calories30avg: window.length >= 7 ? calories30avg : null,
        steps30avg: window.length >= 7 ? steps30avg : null,
      };
    });

    return displayStart
      ? withAverages.filter((row) => isAfter(row.dateObj, displayStart))
      : withAverages;
  }, [reportEntries, displayStart]);

  // Calculate statistics
  const statistics = useMemo(() => {
    if (!chartData.length) {
      return null;
    }

    const weights = chartData.map((d) => d.weight).filter((w) => w > 0);
    const calories = chartData.map((d) => d.netCalories);
    const stepsData = chartData.map((d) => d.steps ?? 0);

    const startWeight = weights[0] || 0;
    const endWeight = weights[weights.length - 1] || 0;
    const maxWeight = Math.max(...weights);
    const minWeight = Math.min(...weights);
    const avgWeight = weights.reduce((a, b) => a + b, 0) / weights.length;
    const weightChange = endWeight - startWeight;

    // Calculate days between first and last entry
    const firstDate = chartData[0]?.dateObj;
    const lastDate = chartData[chartData.length - 1]?.dateObj;
    const daysDiff = firstDate && lastDate
      ? Math.ceil((lastDate.getTime() - firstDate.getTime()) / (1000 * 60 * 60 * 24))
      : 0;
    const weeks = daysDiff / 7;
    const weightChangePerWeek = weeks > 0 ? weightChange / weeks : 0;

    const avgCalories =
      calories.reduce((a, b) => a + b, 0) / calories.length;

    const avgSteps =
      stepsData.reduce((a, b) => a + b, 0) / stepsData.length;

    return {
      startWeight,
      endWeight,
      maxWeight,
      minWeight,
      avgWeight,
      weightChange,
      weightChangePerWeek,
      weightRange: maxWeight - minWeight,
      avgCalories,
      avgSteps,
      totalDays: chartData.length,
    };
  }, [chartData]);

  const dateRangeOptions: { value: DateRange; label: string }[] = [
    { value: 'all', label: 'All Dates' },
    { value: 'month', label: 'Most Recent Month' },
    { value: 'year', label: 'Most Recent Year' },
  ];

  const handleDateRangeChange = (e: SelectChangeEvent<DateRange>) => {
    setDateRange(e.target.value as DateRange);
  };

  const handleLeftAxisChange = (e: SelectChangeEvent<DataType>) => {
    setLeftAxis(e.target.value as DataType);
  };

  const handleRightAxisChange = (e: SelectChangeEvent<DataType>) => {
    setRightAxis(e.target.value as DataType);
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Alert severity="error">Failed to load report data. Please try again later.</Alert>
    );
  }

  return (
    <Box>
      <Typography variant="h4" gutterBottom>
        Reports
      </Typography>

      {/* Controls */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Date Range</InputLabel>
                <Select
                  value={dateRange}
                  onChange={handleDateRangeChange}
                  label="Date Range"
                >
                  {dateRangeOptions.map((option) => (
                    <MenuItem key={option.value} value={option.value}>
                      {option.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Left Axis</InputLabel>
                <Select
                  value={leftAxis}
                  onChange={handleLeftAxisChange}
                  label="Left Axis"
                >
                  {Object.entries(DATA_TYPE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth size="small">
                <InputLabel>Right Axis</InputLabel>
                <Select
                  value={rightAxis}
                  onChange={handleRightAxisChange}
                  label="Right Axis"
                >
                  {Object.entries(DATA_TYPE_LABELS).map(([value, label]) => (
                    <MenuItem key={value} value={value}>
                      {label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Chart */}
      <Card sx={{ mb: 3 }}>
        <CardContent>
          {chartData.length === 0 ? (
            <Alert severity="info">
              No data available for the selected date range.
            </Alert>
          ) : (
            <ResponsiveContainer width="100%" height={400}>
              <LineChart
                data={chartData}
                margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
              >
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis
                  dataKey="date"
                  tick={{ fontSize: 12 }}
                  interval="preserveStartEnd"
                />
                <YAxis
                  yAxisId="left"
                  orientation="left"
                  stroke={DATA_TYPE_COLORS[leftAxis]}
                  domain={['auto', 'auto']}
                  label={{
                    value: DATA_TYPE_LABELS[leftAxis],
                    angle: -90,
                    position: 'insideLeft',
                    style: { textAnchor: 'middle' },
                  }}
                />
                <YAxis
                  yAxisId="right"
                  orientation="right"
                  stroke={DATA_TYPE_COLORS[rightAxis]}
                  domain={['auto', 'auto']}
                  label={{
                    value: DATA_TYPE_LABELS[rightAxis],
                    angle: 90,
                    position: 'insideRight',
                    style: { textAnchor: 'middle' },
                  }}
                />
                <Tooltip />
                <Legend />
                <Line
                  yAxisId="left"
                  type="monotone"
                  dataKey={leftAxis}
                  stroke={DATA_TYPE_COLORS[leftAxis]}
                  name={DATA_TYPE_LABELS[leftAxis]}
                  dot={chartData.length < 100}
                  connectNulls
                />
                <Line
                  yAxisId="right"
                  type="monotone"
                  dataKey={rightAxis}
                  stroke={DATA_TYPE_COLORS[rightAxis]}
                  name={DATA_TYPE_LABELS[rightAxis]}
                  dot={chartData.length < 100}
                  connectNulls
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </CardContent>
      </Card>

      {/* Statistics */}
      {statistics && (
        <Card>
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Statistics
            </Typography>
            <Divider sx={{ mb: 2 }} />
            <Grid container spacing={3}>
              {/* Weight Stats */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Weight
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <StatItem label="Starting Weight" value={`${formatNumber(statistics.startWeight)} lbs`} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem label="Current Weight" value={`${formatNumber(statistics.endWeight)} lbs`} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem label="Max Weight" value={`${formatNumber(statistics.maxWeight)} lbs`} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem label="Min Weight" value={`${formatNumber(statistics.minWeight)} lbs`} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem
                      label="Weight Change"
                      value={`${statistics.weightChange >= 0 ? '+' : ''}${formatNumber(statistics.weightChange)} lbs`}
                      valueColor={statistics.weightChange < 0 ? 'success.main' : statistics.weightChange > 0 ? 'error.main' : undefined}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem
                      label="Change per Week"
                      value={`${statistics.weightChangePerWeek >= 0 ? '+' : ''}${formatNumber(statistics.weightChangePerWeek)} lbs`}
                      valueColor={statistics.weightChangePerWeek < 0 ? 'success.main' : statistics.weightChangePerWeek > 0 ? 'error.main' : undefined}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem label="Average Weight" value={`${formatNumber(statistics.avgWeight)} lbs`} />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem label="Weight Range" value={`${formatNumber(statistics.weightRange)} lbs`} />
                  </Grid>
                </Grid>
              </Grid>

              {/* Calorie and Step Stats */}
              <Grid item xs={12} md={6}>
                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mb: 1 }}>
                  Calories
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <StatItem
                      label="Avg Net Calories/Day"
                      value={Math.round(statistics.avgCalories).toLocaleString()}
                    />
                  </Grid>
                  <Grid item xs={6}>
                    <StatItem label="Total Days Tracked" value={statistics.totalDays.toString()} />
                  </Grid>
                </Grid>

                <Typography variant="subtitle1" sx={{ fontWeight: 'bold', mt: 2, mb: 1 }}>
                  Steps
                </Typography>
                <Grid container spacing={1}>
                  <Grid item xs={6}>
                    <StatItem
                      label="Avg Steps/Day"
                      value={Math.round(statistics.avgSteps).toLocaleString()}
                    />
                  </Grid>
                </Grid>
              </Grid>
            </Grid>
          </CardContent>
        </Card>
      )}
    </Box>
  );
}

interface StatItemProps {
  label: string;
  value: string;
  valueColor?: string;
}

function StatItem({ label, value, valueColor }: StatItemProps) {
  return (
    <Box sx={{ mb: 1 }}>
      <Typography variant="body2" color="text.secondary">
        {label}
      </Typography>
      <Typography
        variant="body1"
        sx={{ fontWeight: 'medium', color: valueColor || 'text.primary' }}
      >
        {value}
      </Typography>
    </Box>
  );
}
