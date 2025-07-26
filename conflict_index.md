# 갈등 지수 (Conflict Index) 계산식

갈등 지수는 특정 제안에 대한 투표가 얼마나 논쟁적이었는지를 나타내는 지표입니다. 이 지수는 찬성(Yes)과 반대(No, NoWithVeto) 의견의 비율을 기반으로 계산되며, 1에 가까울수록 의견 대립이 팽팽했음을 의미하고, 0에 가까울수록 한쪽 의견이 지배적이었음을 나타냅니다.

## 계산 공식

갈등 지수는 다음 공식을 사용하여 계산됩니다:

```
Conflict Index = 1 - |(찬성 비율) - (반대 비율)|
```

여기서 각 비율은 다음과 같이 정의됩니다:

-   **찬성 비율**: `Yes` 투표 수 / (`Yes` + `No` + `NoWithVeto`) 투표 수
-   **반대 비율**: (`No` + `NoWithVeto`) 투표 수 / (`Yes` + `No` + `NoWithVeto`) 투표 수

## TypeScript 구현

```typescript
const calculateConflictIndex = (tally: Record<string, number>): number => {
  const yes = tally.yes_count || 0;
  const no = tally.no_count || 0;
  const veto = tally.no_with_veto_count || 0;

  const total = yes + no + veto;

  if (total === 0) {
    return 0; // 분모가 0이면 갈등 없음으로 처리
  }

  const yesRatio = yes / total;
  const otherRatio = (no + veto) / total;

  const conflictIndex = 1 - Math.abs(yesRatio - otherRatio);

  return conflictIndex;
};
```

## 해석

-   **Conflict Index = 1**: 찬성과 반대 의견이 정확히 50% 대 50%로 나뉜 경우입니다. 이는 가장 높은 수준의 갈등 또는 양극화를 나타냅니다.
-   **Conflict Index = 0**: 모든 투표가 찬성 또는 반대 중 한쪽으로만 이루어진 경우입니다. 이는 완전한 합의 또는 의견 일치를 나타냅니다.

이 지표는 단순히 제안의 통과 여부를 넘어, 커뮤니티 내의 의견 분포와 합의 수준을 이해하는 데 도움을 줍니다.