"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";
import Link from "next/link";
import { FileText, ArrowLeft, Save } from "lucide-react";

export default function ResultsView() {
  const params = useParams();
  const id = params.id as string;
  
  const [form, setForm] = useState<any>(null);
  const [responses, setResponses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      const { data: formData, error: formError } = await supabase
        .from("forms")
        .select("*")
        .eq("id", id)
        .single();
      
      if (formData) {
        setForm(formData);
        
        const { data: responsesData } = await supabase
          .from("responses")
          .select("*")
          .eq("form_id", id)
          .order("created_at", { ascending: false });
          
        if (responsesData) {
          setResponses(responsesData);
        }
      } else {
        console.error("Error fetching form:", formError);
      }
      setLoading(false);
    };

    fetchData();
  }, [id]);

  if (loading) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-purple-600 font-medium">Loading results...</p></main>;
  }

  if (!form) {
    return <main className="min-h-screen bg-gray-50 flex items-center justify-center"><p className="text-gray-500 font-medium">Form not found.</p></main>;
  }

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-5xl mx-auto space-y-8">
        <header className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link href="/" className="text-gray-400 hover:text-gray-900 transition-colors p-2 bg-white rounded-full border border-gray-200">
              <ArrowLeft size={20} />
            </Link>
            <div>
              <h1 className="text-2xl font-bold text-gray-900 leading-tight">{form.title}</h1>
              <div className="text-sm font-medium text-gray-500 pt-1 flex gap-2">
                <span>{responses.length} responses</span>
                <span>•</span>
                <a href={`/f/${form.short_url}`} target="_blank" className="text-purple-600 hover:underline">View Live Form</a>
              </div>
            </div>
          </div>
          <button onClick={() => {
            const csvContent = [
              // Header
              ["Date", ...form.fields.map((f: any) => `"${f.label.replace(/"/g, '""')}"`)].join(","),
              // Rows
              ...responses.map(r => [
                new Date(r.created_at).toLocaleString(),
                ...form.fields.map((f: any) => `"${((r.answers || {})[f.id] || "").replace(/"/g, '""')}"`)
              ].join(","))
            ].join("\n");
            
            const blob = new Blob([csvContent], { type: 'text/csv' });
            const url = window.URL.createObjectURL(blob);
            const a = document.createElement('a');
            a.href = url;
            a.download = `${form.title}-results.csv`;
            a.click();
          }} className="flex items-center gap-2 px-4 py-2 bg-gray-100 hover:bg-gray-200 text-gray-800 font-medium rounded-lg transition-colors border border-gray-200">
            <Save size={18} />
            Export CSV
          </button>
        </header>

        {responses.length === 0 ? (
          <div className="text-center bg-white rounded-xl border border-dashed border-gray-300 p-16 shadow-sm">
             <div className="bg-purple-50 text-purple-600 rounded-full w-16 h-16 flex items-center justify-center mx-auto mb-4">
                 <FileText size={28} />
             </div>
            <h3 className="text-xl font-bold text-gray-900 mb-2">Waiting for responses</h3>
            <p className="text-gray-500 mb-6 text-lg max-w-md mx-auto">Share your form link <span className="font-semibold text-gray-700">({form.short_url})</span> to start collecting input from others.</p>
          </div>
        ) : (
          <div className="space-y-6">
             {responses.map((resp, i) => (
                <div key={resp.id} className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                  <div className="text-xs font-semibold text-gray-400 mb-4 border-b border-gray-100 pb-3 flex justify-between">
                     <span>Response #{responses.length - i}</span>
                     <span>{new Date(resp.created_at).toLocaleString()}</span>
                  </div>
                  <dl className="space-y-4">
                    {form.fields.map((field: any) => (
                      <div key={field.id} className="grid grid-cols-1 sm:grid-cols-3 gap-1 sm:gap-4 items-start pb-4 border-b border-gray-50 last:border-0 last:pb-0">
                         <dt className="text-sm font-semibold text-gray-700 w-full truncate">{field.label || 'Untitled Question'}</dt>
                         <dd className="text-base font-medium text-gray-900 col-span-2">{resp.answers[field.id] || <span className="text-gray-300 italic">No answer</span>}</dd>
                      </div>
                    ))}
                  </dl>
                </div>
             ))}
          </div>
        )}
      </div>
    </main>
  );
}
