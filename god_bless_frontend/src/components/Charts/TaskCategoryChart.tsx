import { useEffect, useState, FC } from 'react';
import ReactApexChart from 'react-apexcharts';
import { ApexOptions } from 'apexcharts';

interface TaskCategoryData {
  category: string;
  count: number;
}

interface TaskCategoryChartProps {
  data: TaskCategoryData[];
}

const TaskCategoryChart: FC<TaskCategoryChartProps> = ({ data }) => {
  const [chartData, setChartData] = useState<{
    series: number[];
    options: ApexOptions;
  }>({
    series: [],
    options: {},
  });

  useEffect(() => {
    const categories = data.map((item) => item.category);
    const counts = data.map((item) => item.count);

    const options: ApexOptions = {
      chart: {
        type: 'donut',
        height: 350,
      },
      colors: ['#3C50E0', '#6577F3', '#8FD0EF', '#0FADCF', '#80CAEE'],
      labels: categories,
      legend: {
        position: 'bottom',
        fontSize: '14px',
        fontFamily: 'Satoshi, sans-serif',
        labels: {
          colors: '#64748B',
        },
      },
      plotOptions: {
        pie: {
          donut: {
            size: '65%',
            labels: {
              show: true,
              total: {
                show: true,
                label: 'Total Tasks',
                fontSize: '16px',
                fontWeight: 600,
                color: '#64748B',
                formatter: function (w) {
                  return w.globals.seriesTotals
                    .reduce((a: number, b: number) => a + b, 0)
                    .toString();
                },
              },
              value: {
                fontSize: '22px',
                fontWeight: 600,
                color: '#1C2434',
              },
            },
          },
        },
      },
      dataLabels: {
        enabled: false,
      },
      responsive: [
        {
          breakpoint: 640,
          options: {
            chart: {
              height: 300,
            },
            legend: {
              position: 'bottom',
            },
          },
        },
      ],
      tooltip: {
        y: {
          formatter: (val: number) => `${val} tasks`,
        },
      },
    };

    setChartData({
      series: counts,
      options,
    });
  }, [data]);

  return (
    <div className="rounded-sm border border-stroke bg-white p-6 shadow-default dark:border-strokedark dark:bg-boxdark">
      <div className="mb-4">
        <h4 className="text-xl font-semibold text-black dark:text-white">
          Tasks by Category
        </h4>
      </div>

      {data.length > 0 ? (
        <div id="taskCategoryChart">
          <ReactApexChart
            options={chartData.options}
            series={chartData.series}
            type="donut"
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

export default TaskCategoryChart;
