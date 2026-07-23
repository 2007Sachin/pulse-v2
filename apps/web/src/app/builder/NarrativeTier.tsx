"use client";

import { useActionState, useState } from "react";
import { BIO_MAX_LENGTH, CAREER_INTENT_MAX_LENGTH, type Narrative } from "@/lib/narrative";
import { saveNarrativeAction, type NarrativeFormState } from "./narrativeActions";
import styles from "./NarrativeTier.module.css";

/**
 * Tier 3 — Narrative. Fully self-authored, deliberately short
 * (ARCHITECTURE.md §4): a plain bio textarea and a single-line career
 * intent input, both hard-capped in length. No rich text editor —
 * character limits are enforced both here (maxLength, live counters) and
 * authoritatively on the api side (T2.5 / apps/api/src/narrative/types.ts).
 */
export function NarrativeTier({ narrative }: { narrative: Narrative }) {
  const initialState: NarrativeFormState = { status: "idle", message: null, narrative };
  const [state, formAction, isPending] = useActionState(saveNarrativeAction, initialState);
  const [bio, setBio] = useState(state.narrative.bio ?? "");
  const [careerIntent, setCareerIntent] = useState(state.narrative.careerIntent ?? "");

  return (
    <section className={styles.tier} aria-labelledby="narrative-heading">
      <h2 id="narrative-heading" className={styles.tierTitle}>
        Narrative
      </h2>
      <p className={styles.tierSubtitle}>A short, in-your-own-words intro. Keep it brief.</p>

      <form action={formAction} className={styles.form}>
        <label className={styles.field}>
          <span className={styles.fieldLabel}>Short bio</span>
          <textarea
            name="bio"
            value={bio}
            onChange={(event) => setBio(event.target.value)}
            maxLength={BIO_MAX_LENGTH}
            rows={3}
            placeholder="Who are you, in a couple of sentences?"
            className={styles.textarea}
          />
          <span className={styles.counter}>
            {bio.length}/{BIO_MAX_LENGTH}
          </span>
        </label>

        <label className={styles.field}>
          <span className={styles.fieldLabel}>Career intent</span>
          <input
            type="text"
            name="careerIntent"
            value={careerIntent}
            onChange={(event) => setCareerIntent(event.target.value)}
            maxLength={CAREER_INTENT_MAX_LENGTH}
            placeholder="What role are you aiming for next?"
            className={styles.input}
          />
          <span className={styles.counter}>
            {careerIntent.length}/{CAREER_INTENT_MAX_LENGTH}
          </span>
        </label>

        <button type="submit" disabled={isPending} className={styles.saveButton}>
          {isPending ? "Saving…" : "Save"}
        </button>

        {state.status === "success" && <p className={styles.successMessage}>{state.message}</p>}
        {state.status === "error" && <p className={styles.errorMessage}>{state.message}</p>}
      </form>
    </section>
  );
}
