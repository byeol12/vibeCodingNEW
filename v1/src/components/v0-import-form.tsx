"use client";

import { useMemo, useState, type ChangeEvent, type FormEvent } from "react";
import { importV0State } from "@/app/dashboard/import-actions";
import {
  parseV0JsonText,
  type V0ImportPreview,
} from "@/domain/v0-import";

type RoomOption = { id: string; title: string; join_code: string };
type StudentOption = { id: string; name: string; room_id: string };

type ImportFormProps = {
  rooms: RoomOption[];
  students: StudentOption[];
  initialRoomId?: string;
};

export function V0ImportForm({
  rooms,
  students,
  initialRoomId,
}: ImportFormProps) {
  const [roomId, setRoomId] = useState(initialRoomId || rooms[0]?.id || "");
  const [studentId, setStudentId] = useState("");
  const [payload, setPayload] = useState("");
  const [preview, setPreview] = useState<V0ImportPreview | null>(null);
  const [parseError, setParseError] = useState("");
  const [pending, setPending] = useState(false);

  const roomStudents = useMemo(
    () => students.filter((student) => student.room_id === roomId),
    [students, roomId],
  );

  async function onFileChange(event: ChangeEvent<HTMLInputElement>) {
    setParseError("");
    setPreview(null);
    setPayload("");
    const file = event.target.files?.[0];
    if (!file) return;
    try {
      const text = await file.text();
      const parsed = parseV0JsonText(text);
      setPayload(text);
      setPreview(parsed.preview);
      if (parsed.preview.studentName) {
        const matched = roomStudents.find(
          (student) => student.name === parsed.preview.studentName,
        );
        if (matched) setStudentId(matched.id);
      }
    } catch (error) {
      setParseError(
        error instanceof Error ? error.message : "파일을 읽지 못했습니다.",
      );
    }
  }

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!payload || !roomId || !studentId) {
      setParseError("방, 학생, JSON 파일을 모두 선택해 주세요.");
      return;
    }
    setPending(true);
    const formData = new FormData();
    formData.set("roomId", roomId);
    formData.set("studentId", studentId);
    formData.set("payload", payload);
    try {
      await importV0State(formData);
    } catch {
      // redirect throws in next server actions
      setPending(false);
    }
  }

  return (
    <form className="form-card import-form" onSubmit={onSubmit}>
      {parseError && (
        <p className="alert alert--error" role="alert">
          {parseError}
        </p>
      )}

      <label className="field">
        <span>수업 방</span>
        <select
          value={roomId}
          onChange={(event) => {
            setRoomId(event.target.value);
            setStudentId("");
          }}
          required
        >
          {rooms.map((room) => (
            <option key={room.id} value={room.id}>
              {room.title} · {room.join_code}
            </option>
          ))}
        </select>
      </label>

      <label className="field">
        <span>가져올 학생 (승인된 학생)</span>
        <select
          value={studentId}
          onChange={(event) => setStudentId(event.target.value)}
          required
        >
          <option value="">학생 선택</option>
          {roomStudents.map((student) => (
            <option key={student.id} value={student.id}>
              {student.name}
            </option>
          ))}
        </select>
      </label>

      <label className="field field--wide">
        <span>v0 JSON 파일</span>
        <input
          type="file"
          accept="application/json,.json"
          onChange={onFileChange}
          required
        />
      </label>

      {preview && (
        <section className="import-preview" aria-live="polite">
          <h2>미리보기</h2>
          <ul>
            <li>
              버전 {preview.version} · 학생명 “{preview.studentName || "없음"}”
            </li>
            <li>
              기간 {preview.programStart || "?"} ~ {preview.programEnd || "?"}
            </li>
            <li>
              평가 {preview.evaluationCount} · 자기관찰 {preview.reflectionCount}{" "}
              · 조커사용 {preview.jokerUsedCount}
            </li>
            <li>
              상점 {preview.shopItemCount} · 구매 {preview.purchaseCount} · 아트{" "}
              {preview.cardArtGrades.join(", ") || "없음"}
            </li>
            <li>
              숙제조커 {preview.homeworkAwardCount} · 회복{" "}
              {preview.recoveryAwardCount} · 수동보너스 {preview.bonusPoints}P
            </li>
            <li>
              주간 성찰 {preview.weeklyReflectionCount}
              {preview.skippedWeeklyReflectionCount
                ? ` (제외 ${preview.skippedWeeklyReflectionCount})`
                : ""}
            </li>
          </ul>
          {preview.warnings.map((warning) => (
            <p className="form-help" key={warning}>
              {warning}
            </p>
          ))}
        </section>
      )}

      <p className="form-help">
        v0에서 JSON을 내보낸 뒤, 여기 방의 일정에 있는 날짜만 가져옵니다. 프레임
        상점 항목은 v1 등급 프레임 정책상 제외됩니다.
      </p>

      <button
        className="button button--primary"
        type="submit"
        disabled={pending || !preview || !studentId}
      >
        {pending ? "가져오는 중…" : "미리보기 확인 후 가져오기"}
      </button>
    </form>
  );
}
