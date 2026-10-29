
import http from 'k6/http';
import { check } from 'k6';

export const options = {
  scenarios: {
    queue_stats_load: {
      executor: 'shared-iterations',
      vus: 20,
      iterations: 1000,
      maxDuration: '3m',
    },
  },
  summaryTrendStats: [
    'avg',
    'min',
    'med',
    'max',
    'p(90)',
    'p(95)',
  ],
};

export default function () {
  const token = __ENV.TOKEN;

  const response = http.get(
    'http://host.docker.internal:8080/api/queue/stats',
    {
      headers: {
        Authorization: `Bearer ${token}`,
      },
      tags: {
        endpoint: 'queue_stats',
      },
    }
  );

  check(response, {
    'status is 200': (r) => r.status === 200,
  });
}