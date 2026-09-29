import type { ReviewRecord } from './types';

/**
 * SYNTHETIC demo records ONLY. No real platform tasks, no client data.
 *
 * These exist so the workflow (tagging → candidate patterns → confirmation →
 * escalation draft) can be exercised offline. They are deliberately messy on
 * purpose: tag spelling and word order vary so the pattern engine has something
 * to group and the human has something to confirm or reject.
 */
export function seedRecords(): ReviewRecord[] {
  const base = Date.parse('2026-08-01T09:00:00.000Z');
  const day = 86_400_000;

  const rows: Array<
    Pick<ReviewRecord, 'reasonTag' | 'decision' | 'rubricRef' | 'confidence' | 'ambiguous' | 'notes'> &
      Partial<Pick<ReviewRecord, 'taskContent'>>
  > = [
    {
      reasonTag: 'off-by-one error',
      decision: 'revise',
      rubricRef: 'R1.2',
      confidence: 'high',
      ambiguous: false,
      notes: 'Counted the range inconsistently with the stated bounds.',
    },
    {
      reasonTag: 'off-by-one',
      decision: 'reject',
      rubricRef: 'R1.2',
      confidence: 'medium',
      ambiguous: false,
      notes: 'Same boundary mistake, but this one also dropped the final element.',
    },
    {
      reasonTag: 'error off by one',
      decision: 'revise',
      rubricRef: 'R1.2',
      confidence: 'high',
      ambiguous: false,
      notes: 'Inclusive/exclusive confusion again.',
    },
    {
      reasonTag: 'missing citation',
      decision: 'revise',
      rubricRef: 'R3.1',
      confidence: 'high',
      ambiguous: false,
      notes: 'Asserted a fact with no supporting reference.',
    },
    {
      reasonTag: 'missing citation',
      decision: 'escalate',
      rubricRef: 'R3.1',
      confidence: 'medium',
      ambiguous: true,
      notes: 'Unclear whether the source was implied; flagged for a second look.',
    },
    {
      reasonTag: 'formatting drift',
      decision: 'accept',
      rubricRef: 'R2.4',
      confidence: 'low',
      ambiguous: false,
      notes: 'Minor whitespace inconsistency, otherwise conformant.',
    },
    {
      reasonTag: 'formatting drift',
      decision: 'accept',
      rubricRef: 'R2.4',
      confidence: 'medium',
      ambiguous: false,
      notes: 'Same issue, cosmetically present.',
    },
    {
      reasonTag: 'formatting-drift',
      decision: 'revise',
      rubricRef: 'R2.4',
      confidence: 'medium',
      ambiguous: false,
      notes: 'Here the drift broke a required section boundary.',
    },
    {
      reasonTag: 'sentiment misread',
      decision: 'reject',
      rubricRef: 'R4.1',
      confidence: 'high',
      ambiguous: false,
      notes: 'Read a neutral statement as negative.',
    },
    {
      reasonTag: 'sentiment misread',
      decision: 'revise',
      rubricRef: 'R4.1',
      confidence: 'medium',
      ambiguous: true,
      notes: 'Possibly sarcasm; not confident it is a misread.',
    },
    {
      reasonTag: 'tone too formal',
      decision: 'accept',
      rubricRef: 'R4.3',
      confidence: 'low',
      ambiguous: false,
      notes: 'Register felt stiff but within tolerance.',
    },
    {
      reasonTag: 'tone too formal',
      decision: 'accept',
      rubricRef: 'R4.3',
      confidence: 'low',
      ambiguous: false,
      notes: 'Style preference, not a guideline breach.',
    },
    {
      reasonTag: 'ambiguous instruction',
      decision: 'unclear',
      rubricRef: 'R0.1',
      confidence: 'low',
      ambiguous: true,
      notes: 'The task itself was underspecified; cannot judge the response fairly.',
    },
    {
      reasonTag: 'hallucinated detail',
      decision: 'escalate',
      rubricRef: 'R3.2',
      confidence: 'high',
      ambiguous: false,
      notes: 'Invented a specific number not present in any supplied source.',
      taskContent:
        '[SYNTHETIC SAMPLE — safe to display] Response asserted "the study covered 4,812 participants" with no source.'.slice(
          0,
          120,
        ),
    },
  ];

  return rows.map((row, i) => {
    const at = new Date(base + i * 2.5 * day).toISOString();
    return {
      id: `demo_${String(i + 1).padStart(3, '0')}`,
      createdAt: at,
      updatedAt: at,
      reasonTag: row.reasonTag,
      decision: row.decision,
      rubricRef: row.rubricRef,
      confidence: row.confidence,
      ambiguous: row.ambiguous,
      notes: row.notes,
      ...(row.taskContent ? { taskContent: row.taskContent } : {}),
    };
  });
}
