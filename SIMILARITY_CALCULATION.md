# Similarity Score Calculation Logic

This document outlines the logic for calculating the similarity score between validators. The calculation is a weighted average designed to provide a nuanced view of validator alignment based on several factors.

## 1. Core Components of the Calculation

The final score is derived from three main components applied to a set of proposals.

### ① Opinion Dispersion Index (ODi) - *The New Polarization Score*

This is the primary weight for each proposal, replacing the old polarization score. It measures how fragmented or controversial a vote was.

*   **Purpose**: To give more weight to proposals where there was significant disagreement or division among all voters, not just a simple "Yes" vs. "No" split.
*   **Calculation**: It uses a normalized Herfindahl-Hirschman Index (HHI) that includes **Yes, No, Veto, and Abstain** votes.
    *   `ODi = 1` means maximum dispersion (e.g., a 4-way even split).
    *   `ODi = 0` means perfect consensus (e.g., 100% Yes).
*   **Application**: This is the **base weight for every proposal** in all calculation modes.

### ② Recency Weight (Ti) - *Similarity Option*

This component gives more weight to more recent proposals.

*   **Activation**: This weight is only applied when the **"Apply recency weighting to similarity"** checkbox is checked. If unchecked, `Ti = 1` for all proposals.
*   **Formula**: `Ti = (proposal_rank / total_proposals)`
    *   `proposal_rank` is the chronological order of the proposal (1 for the oldest, `n` for the newest).

### ③ Agreement (Ai)

This determines if the two validators being compared agreed on a specific proposal.

*   **Value**: `Ai` is either `1` (agreement) or `0` (disagreement).
*   **Logic**:
    *   If `voteA === voteB`, then `Ai = 1`.
    *   **Exception**: If `voteA === voteB === 'ABSTAIN'`, the result depends on the **"Count matching abstentions in similarity"** checkbox.
        *   **Checked**: `Ai = 1` (matching abstains are an agreement).
        *   **Unchecked**: `Ai = 0` (matching abstains are ignored).
    *   If one or both validators did not vote (`NOT_VOTED`), `Ai` is `0`.

---

## 2. Sorting Options (Calculation Modes)

The key difference between the three similarity sorting options (`common`, `base`, `comprehensive`) lies in **which set of proposals are included in the calculation (the "comparison universe")**.

### Mode 1: `Similarity (Common)`

*   **Comparison Universe**: Includes only proposals where **BOTH** the base validator and the target validator voted.
*   **Meaning**: This is the purest measure of ideological alignment. It ignores participation rates and asks: "When these two validators *both* chose to act, how often did they act the same?"

### Mode 2: `Similarity (Base)`

*   **Comparison Universe**: Includes all proposals where the **BASE** validator voted, regardless of whether the target validator did.
*   **Meaning**: This measures how well the target validator aligns with the base validator's entire voting record. If the target validator has a low participation rate on proposals the base validator cared about, their similarity score will be naturally lowered (penalized).

### Mode 3: `Similarity (Comprehensive)`

*   **Comparison Universe**: Includes all proposals where **EITHER** the base validator or the target validator (or both) voted.
*   **Meaning**: This provides the most holistic view, comparing their actions across the widest possible set of relevant proposals. It penalizes non-participation from either side.

---

## 3. Final Calculation Formula

For the selected "comparison universe" of proposals, the final similarity score is the **weighted average of their agreement**:

**Similarity Score = Σ (Ai * ODi * Ti) / Σ (ODi * Ti)**

*   **Numerator**: The sum of weights for proposals where the validators *agreed*.
*   **Denominator**: The sum of weights for *all* proposals in the comparison universe for that mode.

---

## ✏️ Summary Table

| Sort Option | Comparison Universe (Proposals Included) | Key Question Answered |
| :--- | :--- | :--- |
| **Common** | Voted on by **A AND B** | When they both vote, how often do they agree? |
| **Base** | Voted on by **A** | How well does B follow A's voting pattern? |
| **Comprehensive**| Voted on by **A OR B** | Across their combined activity, what is their alignment? |
