"use client";

import { useEffect, useState, useRef } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import SignatureCanvas from "react-signature-canvas";
import Switch from "react-switch";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

export default function EngineerJobs() {
  const [engineer, setEngineer] = useState(null);
  const [maintenanceType, setMaintenanceType] = useState("");
  const [questions, setQuestions] = useState([]);
  const [answers, setAnswers] = useState({});
  const [imagePreview, setImagePreview] = useState(null);
  const [customerName, setCustomerName] = useState("");
  const [inspectorSignature, setInspectorSignature] = useState(null);
  const [customerSignature, setCustomerSignature] = useState(null);
  const [isSignatureVisible, setIsSignatureVisible] = useState(false);
  const [missingFields, setMissingFields] = useState([]);
  const router = useRouter();

  // Use `useRef` for references
  const inspectorSignatureRef = useRef(null);
  const customerSignatureRef = useRef(null);

  useEffect(() => {
    const stored = localStorage.getItem("engineer");
    if (stored) {
      setEngineer(JSON.parse(stored));
    } else {
      router.replace("/engineer/login");
    }
  }, [router]);

  useEffect(() => {
    async function fetchChecklist() {
      if (!maintenanceType) return;
      const { data, error } = await supabase
        .from("checklist_templates")
        .select("question, input_type, order")
        .eq("type", maintenanceType)
        .order("order", { ascending: true });

      if (error) {
        console.error("Error fetching checklist:", error.message);
      } else {
        setQuestions(data);
        setIsSignatureVisible(true); // Show signature fields after questions are fetched
      }
    }

    fetchChecklist();
  }, [maintenanceType]);

  const handleAnswerChange = (index, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [index]: value,
    }));
  };

  const handleImageUpload = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleYesNoToggle = (index, value) => {
    setAnswers((prevAnswers) => ({
      ...prevAnswers,
      [index]: value,
    }));
  };

  const clearSignature = (signatureType) => {
    if (signatureType === "inspector") {
      inspectorSignatureRef.current.clear();
      setInspectorSignature(null);
    } else if (signatureType === "customer") {
      customerSignatureRef.current.clear();
      setCustomerSignature(null);
    }
  };

  // Function to check if all required fields are filled and signatures are done
  const validateForm = () => {
    let missing = [];
    const newAnswers = { ...answers };

    // Check if all required fields are filled
    questions.forEach((q, index) => {
      // Skip 'Yes/No' toggles that are still "No" (untouched)
      if (q.input_type !== "image" && !newAnswers[index]?.trim()) {
        if (q.input_type === "yesno") {
          return;
        }
        missing.push(q.question); // Track missing question
      }
    });

    // Check if signatures are done
    if (inspectorSignatureRef.current.isEmpty()) {
      missing.push("Inspector Signature"); // Track missing signature
    } else {
      setInspectorSignature(
        inspectorSignatureRef.current.getTrimmedCanvas().toDataURL()
      );
    }

    if (customerSignatureRef.current.isEmpty()) {
      missing.push("Customer Signature"); // Track missing signature
    } else {
      setCustomerSignature(
        customerSignatureRef.current.getTrimmedCanvas().toDataURL()
      );
    }

    setMissingFields(missing);
    return missing.length === 0;
  };

  const handleSubmit = () => {
    if (validateForm()) {
      // If validation is successful, log answers to console as JSON
      const submission = {
        ...answers,
        inspector_signature: inspectorSignature,
        customer_signature: customerSignature,
        customer_name: customerName,
        image_preview: imagePreview, // include image preview in submission (base64)
      };

      // Log question with the respective answer
      questions.forEach((q, index) => {
        // If the answer is undefined (untouched yes/no toggle or no text input), set it to null
        let answer = answers[index];

        if (q.input_type === "yesno" && answer === undefined) {
          answer = "No"; // Default to "No" if the toggle is untouched
        }

        // If the input type is "image", the answer should be the base64 URL of the image
        if (q.input_type === "image" && !answer && imagePreview) {
          answer = imagePreview; // Set answer to base64 URL of uploaded image
        }

        // If the answer is undefined or an empty string, set it to null (not the string "null")
        if (answer === undefined || answer === "") {
          answer = null; // Set to null (actual null value, not a string)
        }

        // Log the question with its respective answer
        console.log(`${q.question}: ${answer}`);
      });

      // Log base64 signature and image preview
      console.log("Inspector Signature Base64:", inspectorSignature);
      console.log("Customer Signature Base64:", customerSignature);
      console.log("Image Preview Base64:", imagePreview);

      // Here, you can save this data to Supabase or handle it as required.
    } else {
      console.log("Missing fields");
    }
  };

  return (
    <div className="min-h-screen bg-gray-100 px-4 py-8">
      {engineer ? (
        <div className="w-full bg-white space-y-6">
          <h1 className="text-2xl md:text-3xl font-bold text-gray-800 mb-4">
            Welcome, {engineer.name}
          </h1>

          <div className="mb-6">
            <label
              htmlFor="maintenanceType"
              className="block mb-2 text-sm font-medium text-gray-700"
            >
              Type of Maintenance
            </label>
            <select
              id="maintenanceType"
              value={maintenanceType}
              onChange={(e) => setMaintenanceType(e.target.value)}
              className="w-full md:w-1/2 px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="" disabled>
                Select maintenance type
              </option>
              <option value="Preventive Maintenance">
                Preventive Maintenance
              </option>
              <option value="NCCAL Service Maintenance">
                NCCAL Service Maintenance
              </option>
            </select>
          </div>

          {questions.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-semibold text-gray-700">
                Checklist Questions
              </h2>
              <ol className="list-decimal list-inside space-y-2">
                {questions.map((q, index) => (
                  <li key={index} className="text-gray-800">
                    <div className="flex flex-col space-y-2">
                      <span className="font-semibold">{q.question}</span>

                      {/* Conditional rendering based on input_type */}
                      {q.input_type === "text" && (
                        <input
                          type="text"
                          placeholder={`Answer to ${q.question}`}
                          value={answers[index] || ""}
                          onChange={(e) =>
                            handleAnswerChange(index, e.target.value)
                          }
                          className="px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        />
                      )}

                      {q.input_type === "yesno" && (
                        <div className="flex items-center space-x-4">
                          <label className="text-gray-700">No</label>
                          <Switch
                            checked={answers[index] === "Yes"}
                            onChange={(checked) =>
                              handleYesNoToggle(index, checked ? "Yes" : "No")
                            }
                            offColor="#f0f0f0"
                            onColor="#48bb78"
                            offHandleColor="#ed8936"
                            onHandleColor="#2b6cb0"
                          />
                          <label className="text-gray-700">Yes</label>
                        </div>
                      )}

                      {q.input_type === "number" && (
                        <input
                          type="number"
                          placeholder={`Answer to ${q.question}`}
                          value={answers[index] || ""}
                          onChange={(e) =>
                            handleAnswerChange(index, e.target.value)
                          }
                          className="px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                          style={{
                            WebkitAppearance: "none",
                            MozAppearance: "none",
                            appearance: "none",
                          }} // Remove up/down arrows
                        />
                      )}

                      {q.input_type === "image" && (
                        <div className="flex flex-col space-y-2">
                          <label className="text-gray-700">
                            Upload or Capture Image
                          </label>
                          <input
                            type="file"
                            accept="image/*"
                            onChange={handleImageUpload}
                            className="px-4 py-2 border rounded-lg text-gray-700"
                          />
                          {imagePreview && (
                            <img
                              src={imagePreview}
                              alt="Preview"
                              className="mt-4 w-full max-w-xs rounded-lg"
                            />
                          )}
                        </div>
                      )}
                    </div>
                  </li>
                ))}
              </ol>
            </div>
          )}

          {/* Show signature fields only after questions are loaded */}
          {isSignatureVisible && (
            <div className="space-y-4 mt-8">
              <h2 className="text-xl font-semibold text-gray-700">
                Signatures
              </h2>

              {/* Inspector Signature */}
              <div className="space-y-2">
                <label className="text-gray-700">Inspector Signature</label>
                <SignatureCanvas
                  penColor="black"
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: "border rounded-lg",
                  }}
                  ref={inspectorSignatureRef}
                />
                <div className="flex space-x-4">
                  <button
                    onClick={() => clearSignature("inspector")}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              {/* Customer Signature */}
              <div className="space-y-2">
                <label className="text-gray-700">Customer Signature</label>
                <SignatureCanvas
                  penColor="black"
                  canvasProps={{
                    width: 500,
                    height: 200,
                    className: "border rounded-lg",
                  }}
                  ref={customerSignatureRef}
                />
                <div className="flex space-x-4">
                  <button
                    onClick={() => clearSignature("customer")}
                    className="px-4 py-2 bg-red-500 text-white rounded-lg"
                  >
                    Clear Signature
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <label className="text-gray-700">Customer Name</label>
                <input
                  type="text"
                  placeholder="Enter customer name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-4 py-2 border rounded-lg text-gray-700 focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          )}

          {/* Missing Fields */}
          {missingFields.length > 0 && (
            <div className="bg-red-200 text-red-800 p-4 rounded-lg">
              <h3 className="font-semibold">Missing Fields:</h3>
              <ul className="list-disc list-inside">
                {missingFields.map((field, index) => (
                  <li key={index}>{field}</li>
                ))}
              </ul>
            </div>
          )}

          {/* Submit Button */}
          <div className="mt-6">
            <button
              onClick={handleSubmit}
              className="w-full md:w-1/3 py-2 px-4 bg-blue-600 text-white font-semibold rounded-lg hover:bg-blue-700"
              disabled={!maintenanceType} // Disable if no maintenance type selected
            >
              Submit
            </button>
          </div>
        </div>
      ) : (
        <div>Loading...</div>
      )}
    </div>
  );
}
