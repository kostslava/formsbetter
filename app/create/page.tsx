"use client";

import { useState } from "react";
import { PlusCircle, Image as ImageIcon, Trash2, Save, X, Link as LinkIcon, Share2 } from "lucide-react";
import { supabase } from "@/lib/supabase";
import { nanoid } from "nanoid";
import { QRCodeSVG } from "qrcode.react";

export default function CreateForm() {
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formDescription, setFormDescription] = useState("");
  const [elements, setElements] = useState<{ id: string; type: "text" | "image"; value: string; label: string }[]>([]);
  const [isSaving, setIsSaving] = useState(false);
  const [saveModal, setSaveModal] = useState<{ isOpen: boolean; url: string; formId: string }>({ isOpen: false, url: "", formId: "" });

  const addElement = (type: "text" | "image") => {
    setElements([...elements, { id: crypto.randomUUID(), type, value: "", label: "" }]);
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(e => e.id !== id));
  };

  const saveForm = async () => {
    setIsSaving(true);
    try {
      const shortId = nanoid(7);
      
      const { data, error } = await supabase
        .from('forms')
        .insert([
          { 
            title: formTitle, 
            description: formDescription, 
            fields: elements, 
            short_url: shortId 
          }
        ])
        .select()
        .single();
      
      if (error) {
        console.error("Error saving form to Supabase:", error);
        alert("Failed to save. Have you configured Supabase schemas?");
        return;
      }

      // Save locally to show in dashboard
      const existing = JSON.parse(localStorage.getItem("myForms") || "[]");
      localStorage.setItem("myForms", JSON.stringify([...existing, { id: data.id, shortId, title: formTitle, description: formDescription }]));

      const fullUrl = `${window.location.origin}/f/${shortId}`;
      setSaveModal({ isOpen: true, url: fullUrl, formId: data.id });
    } catch (e) {
      console.error(e);
      alert("Error saving form");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        <div className="flex justify-between items-center bg-white p-4 rounded-xl shadow-sm border border-gray-100">
          <a href="/" className="text-gray-500 hover:text-gray-900 font-medium">← Back</a>
          <button
            onClick={saveForm}
            disabled={isSaving}
            className="flex items-center gap-2 px-6 py-2.5 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-lg shadow-sm transition-colors disabled:opacity-50"
          >
            <Save size={18} />
            {isSaving ? "Saving..." : "Save Form"}
          </button>
        </div>

        <div className="bg-white rounded-xl shadow-sm border-t-8 border-t-purple-600 p-8 text-black">
          <input
            type="text"
            value={formTitle}
            onChange={(e) => setFormTitle(e.target.value)}
            className="text-4xl font-semibold w-full outline-none border-b-2 border-transparent focus:border-purple-600 pb-2 mb-4 transition-colors"
            placeholder="Form Title"
          />
          <input
            type="text"
            value={formDescription}
            onChange={(e) => setFormDescription(e.target.value)}
            className="text-gray-600 w-full outline-none border-b-2 border-transparent focus:border-gray-300 pb-1 transition-colors"
            placeholder="Form description"
          />
        </div>

        {elements.map((el, index) => (
          <div key={el.id} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4 text-black relative group hover:border-l-4 hover:border-l-blue-500 transition-all border-l-4 border-l-transparent">
            <div className="flex justify-between items-start gap-4">
              <input
                type="text"
                value={el.label}
                onChange={(e) => {
                  const newEls = [...elements];
                  newEls[index].label = e.target.value;
                  setElements(newEls);
                }}
                className="text-lg font-medium w-full outline-none bg-gray-50 p-3 rounded-lg focus:ring-2 focus:ring-purple-500 transition-all flex-1"
                placeholder={el.type === "image" ? "Image label/description..." : "Question..."}
              />
              <button onClick={() => removeElement(el.id)} className="p-2 text-gray-400 hover:text-red-500 bg-gray-50 rounded-md transition-colors">
                <Trash2 size={20} />
              </button>
            </div>

            {el.type === "image" ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 gap-2 hover:bg-gray-50 transition-colors cursor-pointer">
                <ImageIcon size={32} className="text-gray-400" />
                <p>Image support requires Supabase Storage wiring</p>
                <p className="text-xs text-gray-400">For now, it acts as a placeholder visual block in the form</p>
              </div>
            ) : (
              <div className="border-b border-gray-300 pb-2 text-gray-400 text-sm">
                Short answer text
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between mt-8 text-black">
          <div className="flex gap-2 bg-white p-2 rounded-xl shadow-sm border border-gray-200">
            <button onClick={() => addElement("text")} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <PlusCircle size={20} className="text-purple-600" />
              <span className="font-medium text-gray-700">Add Question</span>
            </button>
            <div className="w-px bg-gray-200 my-2"></div>
            <button onClick={() => addElement("image")} className="flex items-center gap-2 px-4 py-2 hover:bg-gray-100 rounded-lg transition-colors">
              <ImageIcon size={20} className="text-blue-500" />
              <span className="font-medium text-gray-700">Add Image</span>
            </button>
          </div>
        </div>
      </div>

      {saveModal.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full animate-in fade-in zoom-in duration-200">
            <div className="flex justify-between items-center mb-6">
              <h2 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                <Share2 className="text-purple-600" /> Form Published!
              </h2>
              <button onClick={() => setSaveModal({ isOpen: false, url: "", formId: "" })} className="text-gray-400 hover:text-gray-900 p-2">
                <X size={24} />
              </button>
            </div>
            
            <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 mb-6 flex flex-col items-center justify-center gap-4">
              <p className="text-sm text-gray-500 font-medium">Scan to open form</p>
              <div className="bg-white p-4 rounded-xl shadow-sm">
                <QRCodeSVG value={saveModal.url} size={180} level="H" />
              </div>
            </div>

            <div className="space-y-3">
              <label className="text-sm font-semibold text-gray-700">Short Link</label>
              <div className="flex bg-gray-50 rounded-lg border border-gray-200 overflow-hidden">
                <div className="px-3 py-3 text-gray-500 border-r border-gray-200 bg-gray-100 flex items-center">
                  <LinkIcon size={18} />
                </div>
                <input
                  readOnly
                  value={saveModal.url}
                  className="flex-1 bg-transparent px-3 py-2 text-gray-800 outline-none font-medium truncate"
                />
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(saveModal.url);
                    alert("Copied to clipboard!");
                  }}
                  className="px-4 py-2 bg-purple-100 text-purple-700 font-semibold hover:bg-purple-200 transition-colors"
                >
                  Copy
                </button>
              </div>
            </div>

            <div className="mt-8 flex gap-3">
               <a href="/" className="flex-1 py-3 text-center border-2 border-gray-200 text-gray-700 font-semibold rounded-lg hover:bg-gray-50 transition-colors">
                Dashboard
               </a>
               <a href={`/r/${saveModal.formId}`} className="flex-1 py-3 text-center bg-purple-600 text-white font-semibold rounded-lg hover:bg-purple-700 transition-colors">
                View Results
               </a>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
