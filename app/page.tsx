"use client";

import { useState } from "react";
import { PlusCircle, Image as ImageIcon, Trash2, Link as LinkIcon, Save } from "lucide-react";

export default function Home() {
  const [formTitle, setFormTitle] = useState("Untitled Form");
  const [formDescription, setFormDescription] = useState("");
  const [elements, setElements] = useState<{ id: string; type: "text" | "image"; value: string; label: string }[]>([]);

  const addElement = (type: "text" | "image") => {
    setElements([...elements, { id: crypto.randomUUID(), type, value: "", label: "" }]);
  };

  const removeElement = (id: string) => {
    setElements(elements.filter(e => e.id !== id));
  };

  const saveForm = async () => {
    alert("Form saved! Setup Supabase connection to store this data.");
  };

  return (
    <main className="min-h-screen bg-gray-50 py-10 px-4">
      <div className="max-w-3xl mx-auto space-y-6">
        {/* Form Header */}
        <div className="bg-white rounded-xl shadow-sm border-t-8 border-t-purple-600 p-8">
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
          <div key={el.id} className="bg-white rounded-xl shadow-sm p-6 flex flex-col gap-4 relative group">
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
              <button onClick={() => removeElement(el.id)} className="p-2 text-gray-400 hover:text-red-500 transition-colors">
                <Trash2 size={20} />
              </button>
            </div>

            {el.type === "image" ? (
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 flex flex-col items-center justify-center text-gray-500 gap-2 hover:bg-gray-50 transition-colors cursor-pointer">
                <ImageIcon size={32} className="text-gray-400" />
                <p>Click to upload an image or drag and drop</p>
                <p className="text-xs text-gray-400">PNG, JPG up to 5MB (Requires Supabase Storage!)</p>
              </div>
            ) : (
              <div className="border-b border-gray-300 pb-2 text-gray-400">
                Short answer text
              </div>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between mt-8">
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

          <button onClick={saveForm} className="flex items-center gap-2 px-6 py-3 bg-purple-600 hover:bg-purple-700 text-white font-medium rounded-xl shadow-sm transition-colors">
            <Save size={20} />
            Save Form & Get Link
          </button>
        </div>
      </div>
    </main>
  );
}
