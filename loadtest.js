import http from 'k6/http';
import { check, sleep } from 'k6';

// CHANGE THIS to your staging site's URL before running.
const BASE_URL = 'https://154.7.228.161:8443/';

// Matches the 20 accounts already seeded via tinker
// (loadtest001 ... loadtest020, all password ChangeMe123!).
const TEST_ACCOUNTS = Array.from({ length: 20 }, (_, i) => ({
  username: `loadtest${String(i + 1).padStart(3, '0')}`,
  password: 'ChangeMe123!',
}));

export const options = {
  scenarios: {
    ramping_load: {
      executor: 'ramping-vus',
      startVUs: 0,
      stages: [
        { duration: '1m', target: 1000 },  // ramp to 1k
        { duration: '2m', target: 3000 },  // ramp to 3k
        { duration: '2m', target: 7000 },  // push to worst case
        { duration: '3m', target: 7000 },  // hold at worst case
        { duration: '1m', target: 0 },     // ramp down
      ],
    },
  },
  thresholds: {
    http_req_duration: ['p(95)<2000'],  // flag if 95th percentile > 2s
    http_req_failed: ['rate<0.01'],     // flag if >1% of requests fail
  },
};

export default function () {
  const account = TEST_ACCOUNTS[Math.floor(Math.random() * TEST_ACCOUNTS.length)];

  // 1. Login
  const loginRes = http.post(
    `${BASE_URL}/api/auth/login`,
    JSON.stringify({ username: account.username, password: account.password }),
    { headers: { 'Content-Type': 'application/json', Accept: 'application/json' } },
  );

  check(loginRes, {
    'login succeeded': (r) => r.status === 200,
  });

  if (loginRes.status !== 200) {
    sleep(1);
    return; // don't hammer with authenticated calls if login failed
  }

  const token = loginRes.json('token');
  const authHeaders = {
    headers: {
      Authorization: `Bearer ${token}`,
      Accept: 'application/json',
    },
  };

  sleep(Math.random() * 2); // stagger, like real humans do

  // 2. Dashboard — the heaviest read most roles land on
  const dashRes = http.get(`${BASE_URL}/api/dashboard`, authHeaders);
  check(dashRes, { 'dashboard 200': (r) => r.status === 200 });

  sleep(Math.random() * 2);

  // 3. Events list — what a student checks after a session ends
  const eventsRes = http.get(`${BASE_URL}/api/events`, authHeaders);
  check(eventsRes, { 'events 200': (r) => r.status === 200 });

  sleep(Math.random() * 2);

  // 4. My attendance history — the "did I get marked present" check
  const historyRes = http.get(`${BASE_URL}/api/my-attendance-history`, authHeaders);
  check(historyRes, { 'my-attendance-history 200': (r) => r.status === 200 });

  sleep(Math.random() * 3);
}
