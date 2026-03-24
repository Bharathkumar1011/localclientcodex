import React, { useState, useEffect } from 'react';
import { apiFetch } from '../lib/apiFetch'; 
// Note: adjust the '../lib/apiFetch' path depending on where your apiFetch.ts file lives!
interface DailyActivityWidgetProps {
  type: 'lead' | 'investor' | 'epn';
}

export default function DailyActivityWidget({ type }: DailyActivityWidgetProps) {
  const [data, setData] = useState({ stageMovements: [], notes: [] });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'movements' | 'notes'>('movements');

  useEffect(() => {
    const fetchFeed = async () => {
      try {
        const res = await apiFetch(`/api/analytics/daily-feed?type=${type}`);
        if (res.ok) {
          const json = await res.json();
          if (json.success) {
            setData(json.data);
          }
        }
      } catch (error) {
        console.error("Failed to fetch daily feed", error);
      } finally {
        setLoading(false);
      }
    };
    
    fetchFeed();
  }, [type]);

  if (loading) {
    return (
      <div className="w-full p-6 border rounded-lg bg-gray-50 animate-pulse">
        <div className="h-4 bg-gray-200 rounded w-1/4 mb-4"></div>
        <div className="h-10 bg-gray-200 rounded w-full"></div>
      </div>
    );
  }

  const title = type.charAt(0).toUpperCase() + type.slice(1);

  return (
    <div className="w-full bg-white border rounded-lg shadow-sm mb-6">
      <div className="px-6 py-4 border-b flex justify-between items-center bg-gray-50 rounded-t-lg">
        <h3 className="text-lg font-semibold text-gray-800">
          Last 24 Hours: {title} Activity
        </h3>
        <div className="flex space-x-2">
          <button
            onClick={() => setActiveTab('movements')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'movements' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            Stage Movements ({data.stageMovements?.length || 0})
          </button>
          <button
            onClick={() => setActiveTab('notes')}
            className={`px-3 py-1 text-sm rounded-md transition-colors ${
              activeTab === 'notes' 
                ? 'bg-blue-100 text-blue-700 font-medium' 
                : 'bg-white border text-gray-600 hover:bg-gray-50'
            }`}
          >
            Recent Notes ({data.notes?.length || 0})
          </button>
        </div>
      </div>

      <div className="p-0">
        {activeTab === 'movements' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Team Member</th>
                  <th className="px-6 py-3">Entity ID</th>
                  <th className="px-6 py-3">Movement</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.stageMovements?.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-6 py-4 text-center text-gray-500">No stage movements in the last 24 hours.</td>
                  </tr>
                ) : (
                  data.stageMovements.map((move: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900">
                        {move.user ? `${move.user.firstName} ${move.user.lastName}` : 'System'}
                      </td>
                      <td className="px-6 py-3">#{move.entityId}</td>
                      <td className="px-6 py-3">
                        <span className="text-gray-500">{move.oldValue}</span>
                        <span className="mx-2 text-blue-500">→</span>
                        <span className="font-medium text-green-600">{move.newValue}</span>
                      </td>
                      <td className="px-6 py-3 text-gray-500">
                        {new Date(move.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}

        {activeTab === 'notes' && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm text-left">
              <thead className="text-xs text-gray-500 uppercase bg-gray-50 border-b">
                <tr>
                  <th className="px-6 py-3">Team Member</th>
                  <th className="px-6 py-3">Note Preview</th>
                  <th className="px-6 py-3">Time</th>
                </tr>
              </thead>
              <tbody>
                {data.notes?.length === 0 ? (
                  <tr>
                    <td colSpan={3} className="px-6 py-4 text-center text-gray-500">No notes added in the last 24 hours.</td>
                  </tr>
                ) : (
                  data.notes.map((note: any, idx: number) => (
                    <tr key={idx} className="border-b hover:bg-gray-50">
                      <td className="px-6 py-3 font-medium text-gray-900 whitespace-nowrap">
                        {note.user?.firstName ? `${note.user.firstName} ${note.user.lastName || ''}` : 'System / Unknown'}
                      </td>
                      <td className="px-6 py-3 text-gray-700">
                        {note.note.length > 80 ? note.note.substring(0, 80) + '...' : note.note}
                      </td>
                      <td className="px-6 py-3 text-gray-500 whitespace-nowrap">
                        {new Date(note.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}