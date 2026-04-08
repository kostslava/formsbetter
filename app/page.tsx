"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Plus, FileText, BarChart } from "lucide-react";

export default function Dashboard() {
  const [forms, setForms] = useState<any[]>([]);

  useEffect(() => {
    // In a real app, this would fetch from Supabase securely via Auth.
    // For this prototype, we're storing form definitions or IDs locally to
    // simulate a "dashboard" without requiring login for the creator.
    const savedForms = JSON.parse(localStorage.getItem("myForms") || "[]");
    setForms(savedForms);
  }, []);

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <h1 className="text-3xl font-bold text-gray-900">My Forms</h1>
          <Link
            href="/create"
            className="flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
          >
            <Plus size={20} />
            <span>New Form</span>
          </Link>
        </header>

        <div className="flex gap-4 border-b border-gray-200 pb-2">
          <div className="text-purple-600 font-semibold border-b-2 border-purple-600 pb-2 cursor-pointer">
            Recent Forms
          </div>
        </div>

        {forms.length === 0 ? (
          <div className="text-center bg-white rounded-xl border border-dashed border-gray-300 p-12">
            <h3 className="text-lg font-medium text-gray-900 mb-2">No forms yet</h3>
            <p className="text-gray-500 mb-4">Create your first form to start collecting responses.</p>
            <Link
              href="/create"
              className="inline-flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 text-white font-medium py-2 px-4 rounded-lg transition-colors"
            >
              <Plus size={20} />
              <span>Create Form</span>
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {forms.map((form) => (
              <div key={form.id} className="bg-white border text-black border-gray-200 rounded-xl overflow-hidden shadow-sm hover:shadow-md transition-shadow group">
                <div className="p-5 flex flex-col items-start gap-3 h-full">
                  <div className="bg-purple-100 p-3 rounded-lg text-purple-600">
                    <FileText size={24} />
                  </div>
                  <div className="flex-1 w-full">
                    <h3 className="font-semibold text-lg text-gray-900 truncate">
                      {form.title || "Untitled Form"}
                    </h3>
                    <p className="text-sm text-gray-500 mt-1 line-clamp-2">
                      {form.description || "No description"}
                    </p>
                  </div>
                  <div className="mt-4 pt-4 border-t border-gray-100 flex items-center justify-between w-full">
                    <Link
                      href={`/f/${form.shortId}`}
                      className="text-sm text-gray-600 hover:text-purple-600 font-medium"
                    >
                      View Live
                    </Link>
                    <Link
                      href={`/r/${form.id}`}
                      className="bg-gray-100 hover:bg-gray-200 text-gray-800 text-sm py-1.5 px-3 rounded-md font-medium flex gap-1.5 items-center transition-colors"
                    >
                      <BarChart size={16} /> Results
                    </Link>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </main>
  );
}
