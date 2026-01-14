// // 申请建组页面

// import { useState } from "react";
// import NatureButton from "../../components/NatureButton";
// type CreateTeamApplicationReq = {
//   name: string;
//   signature: string;
//   qqNumber: string;
//   description: string;
// };
// import { useToast } from "../../components/NotificationToast";
// import { Users, FileText, MessageSquare, AlignLeft } from "lucide-react";
// import "./ApplyTeamPage.css";

// export default function ApplyTeamPage() {
//   const [name, setName] = useState<string>("");
//   const [signature, setSignature] = useState<string>("");
//   const [qqNumber, setQqNumber] = useState<string>("");
//   const [description, setDescription] = useState<string>("");
//   const [isLoading, setIsLoading] = useState<boolean>(false);
//   const { showToast } = useToast();

//   async function handleSubmit(): Promise<void> {
//     if (!name.trim()) {
//       showToast("error", "请输入汉化组名称");
//       return;
//     }

//     if (!signature.trim()) {
//       showToast("error", "请输入汉化组简介");
//       return;
//     }

//     if (!qqNumber.trim()) {
//       showToast("error", "请输入 QQ 号");
//       return;
//     }

//     if (!description.trim()) {
//       showToast("error", "请输入详细描述");
//       return;
//     }

//     const req: CreateTeamApplicationReq = {
//       name: name.trim(),
//       signature: signature.trim(),
//       qqNumber: qqNumber.trim(),
//       description: description.trim(),
//     };

//     setIsLoading(true);

//     try {
//       await __mockApplyTeam(req);

//       showToast("success", "申请已提交，请等待审核");

//       setName("");
//       setSignature("");
//       setQqNumber("");
//       setDescription("");
//     } catch (error) {
//       console.error("Apply team failed", error);

//       showToast("error", "申请提交失败，请稍后重试");
//     } finally {
//       setIsLoading(false);
//     }
//   }

//   return (
//     <div className="apply-team-page">
//       <div className="apply-team-card">
//         <div className="apply-team-header">
//           <h3>申请创建汉化组</h3>
//         </div>

//         <div className="apply-team-body">
//           <div className="apply-team-field">
//             <div className="apply-team-field-icon">
//               <Users size={18} />
//             </div>
//             <input
//               className="apply-team-input"
//               type="text"
//               placeholder="汉化组名称"
//               value={name}
//               onChange={(e) => setName(e.target.value)}
//               disabled={isLoading}
//             />
//           </div>

//           <div className="apply-team-field">
//             <div className="apply-team-field-icon">
//               <FileText size={18} />
//             </div>
//             <input
//               className="apply-team-input"
//               type="text"
//               placeholder="汉化组简介"
//               value={signature}
//               onChange={(e) => setSignature(e.target.value)}
//               disabled={isLoading}
//             />
//           </div>

//           <div className="apply-team-field">
//             <div className="apply-team-field-icon">
//               <MessageSquare size={18} />
//             </div>
//             <input
//               className="apply-team-input"
//               type="text"
//               placeholder="联系 QQ 号"
//               value={qqNumber}
//               onChange={(e) => setQqNumber(e.target.value)}
//               disabled={isLoading}
//             />
//           </div>

//           <div className="apply-team-field">
//             <div className="apply-team-field-icon">
//               <AlignLeft size={18} />
//             </div>
//             <textarea
//               className="apply-team-textarea"
//               placeholder="描述创建汉化组的理由及计划"
//               value={description}
//               onChange={(e) => setDescription(e.target.value)}
//               disabled={isLoading}
//               rows={4}
//             />
//           </div>

//           <div style={{ height: 8 }} />

//           <div className="apply-team-footer">
//             <NatureButton
//               variant="cloud"
//               onClick={handleSubmit}
//               disabled={isLoading}
//             >
//               {isLoading ? "提交中..." : "提交申请"}
//             </NatureButton>
//           </div>
//         </div>
//       </div>
//     </div>
//   );
// }
