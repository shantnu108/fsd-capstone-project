import React, { useEffect, useRef, useState } from 'react';
import io from 'socket.io-client';
import { Line } from 'react-chartjs-2';
import { Chart as ChartJS } from 'chart.js/auto';
import zoomPlugin from 'chartjs-plugin-zoom';

ChartJS.register(zoomPlugin);

const SOCKET_URL = 'http://localhost:4000';
const MAX_POINTS = 60;

export default function Dashboard() {
  const [connected, setConnected] = useState(false);
  const [windowSize, setWindowSize] = useState('1s');
  const [dataMap, setDataMap] = useState({
    '1s': [],
    '5s': [],
    '60s': [],
  });
  const [status, setStatus] = useState('loading'); 
  const socketRef = useRef(null);
  const lastSeenRef = useRef(localStorage.getItem('lastSeen'));

  // Connect to backend via WebSocket
  useEffect(() => {
    const socket = io(SOCKET_URL, { transports: ['websocket'] });
    socketRef.current = socket;

    socket.on('connect', () => {
      console.log('✅ Connected to server');
      setConnected(true);
      setStatus('ready');
      socket.emit('hello', { lastSeen: lastSeenRef.current });
    });

    socket.on('disconnect', () => {
      console.log('❌ Disconnected');
      setConnected(false);
    });

    socket.on('metrics', (msg) => handleIncoming(msg));
    socket.on('replay', (rows) => rows.forEach((r) => handleIncoming(r)));

    socket.on('connect_error', (err) => {
      console.error('Connection error:', err.message);
      setStatus('error');
    });

    return () => socket.disconnect();
  }, []);

  // Handle incoming data for multiple windows
  const handleIncoming = (msg) => {
    const ts = new Date(msg.ts).getTime();
    const payload = msg.payload;
    // Expected payload: { eps1s, eps5s, eps60s }
    const updates = {
      '1s': payload.eps1s ?? payload.eps ?? 0,
      '5s': payload.eps5s ?? payload.eps ?? 0,
      '60s': payload.eps60s ?? payload.eps ?? 0,
    };

    setDataMap((prev) => {
      const next = { ...prev };
      Object.keys(updates).forEach((key) => {
        const series = [...(prev[key] || []), { ts, value: updates[key] }];
        const unique = Array.from(new Map(series.map((p) => [p.ts, p])).values());
        next[key] = unique.slice(-MAX_POINTS);
      });
      return next;
    });

    lastSeenRef.current = ts;
    localStorage.setItem('lastSeen', ts);
  };

  const chartData = {
    labels: (dataMap[windowSize] || []).map((p) => new Date(p.ts).toLocaleTimeString()),
    datasets: [
      {
        label: `Events/sec (${windowSize})`,
        data: (dataMap[windowSize] || []).map((p) => p.value),
        borderColor: '#3b82f6',
        backgroundColor: 'rgba(59,130,246,0.2)',
        fill: true,
        tension: 0.3,
        borderWidth: 2,
        pointRadius: 3,
        pointBackgroundColor: '#2563eb',
      },
    ],
  };

  const options = {
    responsive: true,
    interaction: {
      mode: 'nearest',
      intersect: false,
    },
    plugins: {
      legend: {
        labels: {
          color: '#111827',
          font: { size: 14, weight: '600' },
        },
      },
      tooltip: {
        enabled: true,
        mode: 'index',
        callbacks: {
          label: (ctx) => `${ctx.dataset.label}: ${ctx.formattedValue}`,
        },
      },
      zoom: {
        zoom: {
          wheel: { enabled: true },
          pinch: { enabled: true },
          mode: 'x',
        },
        pan: {
          enabled: true,
          mode: 'x',
        },
        limits: { x: { min: 'original', max: 'original' } },
      },
    },
    scales: {
      y: {
        grid: { color: '#e5e7eb' },
        ticks: { color: '#374151' },
        title: { display: true, text: 'Events/sec', color: '#1e3a8a' },
      },
      x: {
        grid: { color: '#f3f4f6' },
        ticks: { color: '#6b7280' },
      },
    },
  };

  const resetZoom = () => {
    const chart = ChartJS.getChart('realtime-chart');
    if (chart) chart.resetZoom();
  };

  return (
    <div
      style={{
        padding: '2rem',
        background: 'linear-gradient(to right, #eef2ff, #f8fafc)',
        minHeight: '100vh',
        fontFamily: 'Inter, sans-serif',
      }}
    >
      <div
        style={{
          maxWidth: '900px',
          margin: '0 auto',
          background: 'white',
          padding: '2rem',
          borderRadius: '1rem',
          boxShadow: '0 4px 15px rgba(0,0,0,0.08)',
        }}
      >
        <h1
          style={{
            fontSize: '1.75rem',
            fontWeight: '700',
            color: '#1e3a8a',
            textAlign: 'center',
            marginBottom: '0.5rem',
          }}
        >
          ⚡ Real-Time Analytics Dashboard
        </h1>

        <p
          style={{
            textAlign: 'center',
            color: connected ? '#16a34a' : '#dc2626',
            fontWeight: '600',
            marginBottom: '1rem',
          }}
        >
          Status: {connected ? '🟢 Connected' : '🔴 Disconnected'}
        </p>

        {/* Time Range Selector */}
        <div
          style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '1rem',
            gap: '0.5rem',
          }}
        >
          {['1s', '5s', '60s'].map((w) => (
            <button
              key={w}
              onClick={() => setWindowSize(w)}
              style={{
                background: windowSize === w ? '#2563eb' : '#e5e7eb',
                color: windowSize === w ? 'white' : '#1e3a8a',
                fontWeight: '600',
                borderRadius: '0.5rem',
                border: 'none',
                padding: '0.5rem 1rem',
                cursor: 'pointer',
                transition: '0.2s ease',
              }}
            >
              {w} Window
            </button>
          ))}
        </div>

        <div style={{ height: '400px' }}>
          {status === 'loading' && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
              Connecting to server...
            </p>
          )}
          {status === 'error' && (
            <p style={{ textAlign: 'center', color: '#dc2626', fontWeight: '600' }}>
              ⚠️ Connection error. Please retry.
            </p>
          )}
          {status === 'ready' && (dataMap[windowSize] || []).length === 0 && (
            <p style={{ textAlign: 'center', color: '#6b7280', fontStyle: 'italic' }}>
              Waiting for data...
            </p>
          )}
          {status === 'ready' && (dataMap[windowSize] || []).length > 0 && (
            <Line id="realtime-chart" data={chartData} options={options} />
          )}
        </div>

        <div style={{ textAlign: 'center', marginTop: '1rem' }}>
          <button
            onClick={resetZoom}
            style={{
              background: '#f3f4f6',
              border: '1px solid #d1d5db',
              borderRadius: '0.5rem',
              padding: '0.5rem 1rem',
              cursor: 'pointer',
              fontWeight: '600',
            }}
          >
            🔄 Reset Zoom
          </button>
        </div>
      </div>
    </div>
  );
}
