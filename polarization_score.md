# 양극화 점수 (Polarization Score) 계산식

양극화 점수는 특정 제안에 대한 투표가 얼마나 논쟁적이었는지를 측정하는 지표입니다. 점수는 0부터 1까지의 범위를 가지며, 1에 가까울수록 찬성과 반대 의견이 팽팽하게 대립했음을 의미합니다.

## 계산 공식

양극화 점수(`Pi`)는 다음과 같이 계산됩니다.

```
Pi = 1 - |(찬성 비율) - (반대 비율)|
```

여기서 각 비율은 다음과 같이 정의됩니다.

*   **찬성 비율**: `찬성표 / (찬성표 + 반대표 + 거부권 행사표)`
*   **반대 비율**: `(반대표 + 거부권 행사표) / (찬성표 + 반대표 + 거부권 행사표)`

**참고:** 기권(Abstain) 및 미투표(No Vote)는 양극화 점수 계산에 포함되지 않습니다.

## 소스코드 구현

다음은 `src/stores/useGlobalStore.ts`에 구현된 실제 TypeScript 코드입니다.

```typescript
const calculatePolarizationScore = (tally: Record<string, number>): number => {
  const {
    yes_count = 0,
    no_count = 0,
    no_with_veto_count = 0,
  } = tally;

  const yesVotes = yes_count;
  const otherVotes = no_count + no_with_veto_count;
  const totalVotes = yesVotes + otherVotes;

  if (totalVotes === 0) {
    return 0;
  }

  const yesRatio = yesVotes / totalVotes;
  const otherRatio = otherVotes / totalVotes;
  const polarization = 1 - Math.abs(yesRatio - otherRatio);
  
  return polarization;
};
```
