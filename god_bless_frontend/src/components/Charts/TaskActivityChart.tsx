import { useEffect, useState, FC } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface TaskActivityData {
  hour?: string;
  date?: string;
  count: number;
}

interface TaskActivityChartProps {
  data: TaskActivityData[];
  title: string;
  type?: 'hourly' | 'daily';
}

const TaskActivityChart: FC<TaskActivityChartProps> = ({
  data,
  title,
  type = 'hourly',
}) => {
  const [chartData, setChartData] = useState<{
    series: ApexAxisChartSeries;
    options: ApexOptions;
  }>({
    series: [],
    options: {},
  });

  useEffect(() => {
    // Format data for chart
    const categories = data.map((item) => {
      if (type === 'hourly' && item.hour) {
        const date = new Date(item.hour);
        return date.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
        });
      } else if (type === 'daily' && item.date) {
        const date = new Date(item.date);
        return date.toLocaleDateString('en-US', {
          month: 'short',
          day: 'numeric',
        });
      }
      return '';
    });

    const counts = data.map((item) => item.count);

    const options: ApexOptions = {
      chart: {
        type: 'area',
        height: 350,
        toolbar: {
          show: false,
        },
        zoom: {
          enabled: false,
        },
      },
      colors: ['#3C50E0'],
      dataLabels: {
        enabled: false,
      },
      stroke: {
        curve: 'smooth',
        width: 2,
      },
      fill: {
        type: 'gradient',
        gradient: {
          shadeIntensity: 1,
          opacityFrom: 0.4,
          opacityTo: 0.1,
          stops: [0, 90, 100],
        },
      },
      xaxis: {
        categories: categories,
        labels: {
          style: {
            colors: '#64748B',
            fontSize: '12px',
          },
        },
      },
      yaxis: {
        title: {
          text: 'Tasks',
          style: {
            color: '#64748B',
            fontSize: '14px',
          },
        },
        labels: {
          style: {
            colors: '#64748B',
            fontSize: '12px',
          },
        },
      },
      grid: {
        borderColor: '#E2E8F0',
        strokeDashArray: 5,
      },
      tooltip: {
        theme: 'dark',
        x: {
          show: true,
        },
        y: {
          formatter: (val: number) => `${val} tasks`,
        },
      },
    };

    setChartData({
      series: [
        {
          name: 'Tasks',
          data: counts,
        },
      ],
      options,
    });
  }, [data, type]);

  return (
    <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          {title}
        </h4>
      </div>

      {data.length > 0 ? (
        <div id="taskActivityChart">
          <ReactApexChart
            options={chartData.options}
            series={chartData.series}
            type="area"
            height={350}
          />
        </div>
      ) : (
        <div className="flex h-[350px] items-center justify-center">
          <p className="text-gray-500 dark:text-gray-400">No data available</p>
        </div>
      )}
    </div>
  );
};

export default TaskActivityChart;
