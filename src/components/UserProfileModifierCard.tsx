import { useEffect, useState } from "react";
import "./UserProfileModifierCard.css";

type SavePayload = {
  nickname: string;
  signature: string;
};

type Props = {
  initialNickname?: string;
  initialSignature?: string;
  onSave?: (payload: SavePayload) => void;
};

/**
 * 用户资料编辑卡片组件
 * 用于草稿板预览，保持行为与 samples/user-profile-modifier-card.html 一致
 */
export default function UserProfileModifierCard({
  initialNickname = "林深时见鹿",
  initialSignature = "树深时见鹿，溪午不闻钟。",
  onSave,
}: Props) {
  const [nickname, setNickname] = useState<string>(initialNickname);
  const [signature, setSignature] = useState<string>(initialSignature);
  const [saving, setSaving] = useState<boolean>(false);
  const maxSig = 15;

  useEffect(() => {
    // 初始化时把传入的初始值写入状态
    setNickname(initialNickname);
    setSignature(initialSignature);
  }, [initialNickname, initialSignature]);

  function handleSave() {
    setSaving(true);

    // 模拟保存延时，并回调 onSave
    setTimeout(() => {
      setSaving(false);

      if (onSave) {
        onSave({ nickname, signature });
      }
    }, 900);
  }

  return (
    <div className="modifier-card">
      <div className="header">
        <h2>编辑个人资料</h2>
      </div>

      <div className="form-group">
        <label htmlFor="edit-nickname">昵称</label>
        <input
          id="edit-nickname"
          className="input-control"
          maxLength={20}
          placeholder="想个好听的名字"
          value={nickname}
          onChange={(e) => setNickname(e.target.value)}
        />
      </div>

      <div className="form-group">
        <label htmlFor="edit-signature">个性签名</label>
        <textarea
          id="edit-signature"
          className="input-control"
          maxLength={maxSig}
          placeholder="一句话介绍你自己..."
          value={signature}
          onChange={(e) => setSignature(e.target.value)}
        />
        <div className="counter">{signature.length}/{maxSig}</div>
      </div>

      <div className="button-group">
        <button
          className="btn btn-cancel"
          onClick={() => {
            // 取消：恢复为初始值
            setNickname(initialNickname);
            setSignature(initialSignature);
          }}
        >
          取消
        </button>

        <button
          className="btn btn-save"
          onClick={() => handleSave()}
          disabled={saving}
        >
          {saving ? "保存中..." : "保存更改"}
        </button>
      </div>
    </div>
  );
}
