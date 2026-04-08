"use client";

import { useEffect, useState } from "react";
import { useParams } from "next/navigation";
import { supabase } from "@/lib/supabase";

export default function FormView() {
  const params = useParams();
  const id = params.id as string;
  
  const [form, setForm] = useState<any>(null);
  const [answers, setAnswers] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  useEffect(() => {
    const fetchForm = async () => {
      const { data, error } = await supabase
        .from("forms")
        .select("*")
        .eq("short_url", id)
        .single();
      
      if (data) {
        setForm(data);
      } else {
        console.error("Error fetching form:", error);
      }
      setLoading(false);
    };

    fetchForm();
  }, [id]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    
    try {
      const { error } = await supabase
        .from("responses")
        .insert([
          { form_id: form.id, answers }
        ]);

      if (error) throw error;
      setSubmitted(true);
    } catch (e) {
      console.error(e);
      alert("Failed to submit form.");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return <main className="min-h-screen bg-purple-50 flex items-center justify-center"><p className="text-purple-600 font-medium">Loading form...</p></main>;
  }

  if (!form) {
    return <main className="min-h-screen bg-purple-50 flex items-center justify-center"><p className="text-gray-500 font-medium">Form not found.</p></main>;
  }

  if (submitted) {
    return (
      <main className="min-h-screen bg-purple-50 py-10 px-4 flex items-center justify-center">
        <div className="max-w-2xl w-full bg-white rounded-xl shadow-lg border-t-8 border-t-purple-600 p-10 text-center">
          <h1 className="text-3xl font-bold text-gray-900 mb-4">{form.title}</h1>
          <p className="text-gray-600 text-lg">Your response has been recorded.</p>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-purple-50 py-10 px-4">
      <form onSubmit={handleSubmit} className="max-w-3xl mx-auto space-y-6">
        <div className="bg-white rounded-xl shadow-md border-t-8 border-t-purple-600 p-8">
          <h1 className="text-4xl font-bold text-gray-900 mb-4">
            {form.title}
          </h1>
          {form.description && (
            <p className="text-gray-600 text-lg leading-relaxed border-t border-gray-100 pt-4">
              {form.description}
            </p>
          )}
        </div>

        {form.fields?.map((el: any, index: number) => (
          <div key={el.id} className="bg-white rounded-xl shadow-sm p-8 flex flex-col gap-4 border border-gray-100">
            <h3 className="text-lg font-semibold text-gray-900">
              {el.label || `Question ${index + 1}`}
              <span className="text-red-500 ml-1">*</span>
            </h3>
            
            {el.type === "text" && (
              <input
                type="text"
                required
                className="w-full text-black outline-none border-b-2 border-gray-200 focus:border-purple-600 pb-2 transition-colors focus:bg-purple-50/50 px-2 pt-2 rounded-t-md"
                placeholder="Your answer"
                value={answers[el.id] || ""}
                onChange={(e) => setAnswers({ ...answers, [el.id]: e.target.value })}
              />
            )}
            {el.type === "image" && (
              <div className="p-4 bg-gray-50 border border-gray-200 rounded-lg text-gray-500 text-sm">
                [Image block] - {el.value || "Placeholder graphic"}
              </div>
            )}
          </div>
        ))}

        <div className="pt-4 flex justify-between items-center">
          <button
            type="submit"
            disabled={submitting}
            className="px-8 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white font-bold rounded-xl shadow-md transition-colors"
          >
            {submitting ? "Submitting..." : "Submit"}
          </button>
          <div className="text-sm font-medium text-gray-400">
            FormsBetter
          </div>
        </div>
      </form>
    </main>
  );
}
