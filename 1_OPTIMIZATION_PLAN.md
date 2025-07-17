### 프로젝트 목표 및 데이터 최적화 계획

---

### 1. 프로젝트 목표

현재 웹 시스템은 단일 거대 JSON 파일을 로드하여 발생하는 심각한 성능 문제를 겪고 있습니다. 우리의 핵심 목표는 **데이터 구조를 근본적으로 재설계하여 애플리케이션을 빠르고 효율적으로 만들고, 향후 복잡한 데이터 상호작용 기능을 추가할 수 있는 확장 가능한 기반을 마련하는 것**입니다.

### 2. 핵심 사용자 상호작용 (기대 기능)

최적화된 시스템은 다음 기능들을 빠르고 원활하게 지원해야 합니다.

*   **메인 시각화:**
    *   **검증인(Validator) x 제안(Proposal) 히트맵:** 사용자가 선택한 체인의 검증인과 제안에 대한 투표 성향을 한눈에 보여주는 핵심 뷰.

*   **필터링 및 검색:**
    *   **체인 선택:** 시각화할 특정 블록체인을 선택합니다. (예: Cosmos, Akash)
    *   **검증인 검색:** 특정 검증인의 이름을 검색하여 히트맵에서 강조하거나 필터링합니다.
    *   **제안 타입 필터링:** 제안의 종류(예: `SoftwareUpgrade`, `CommunityPoolSpend`)에 따라 필터링합니다.

*   **고급 기능 (신규):**
    *   **대립 정도(Contention)에 따른 제안 필터링:** 투표의 찬반 비율(예: `yes` vs `no`)을 기반으로, 합의가 높았던 제안이나 논쟁이 치열했던 제안만 골라볼 수 있는 기능.
    *   **최신 제안에 대한 일치율 가중치:** 두 검증인 간의 투표 성향 일치율을 계산할 때, 더 최근의 제안에 높은 가중치를 부여하여 현재 및 미래의 관계를 더 정확하게 예측하는 기능.

### 3. 데이터 정제 전략

**"하나의 거대한 파일"**에서 **"체인별로 분리된, 작고 정규화된 파일들"**로 전환하는 것이 핵심 전략입니다.

*   **파일 형식:** 모든 데이터는 웹 환경에 네이티브하고 구조적 표현이 용이한 **JSON** 형식을 사용합니다.

*   **디렉토리 구조:**
    ```
    public/data/
    ├── cosmos/
    │   ├── proposals.json
    │   ├── validators.json
    │   └── votes.json
    ├── akash/
    │   ├── proposals.json
    │   ├── validators.json
    │   └── votes.json
    └── ... (다른 모든 체인)
    ```

*   **파일별 상세 구조:**

    *   **`proposals.json` (제안 정보):**
        ```json
        [
          {
            "proposal_id": 123,
            "chain_id": "cosmos",
            "title": "Software Upgrade v9",
            "type": "SoftwareUpgrade",
            "submit_time": "2023-10-26T14:30:00Z",
            "final_tally_result": { "yes_count": "...", "no_count": "..." }
          }
        ]
        ```
        *   `submit_time`은 **최신 제안 가중치** 계산에, `final_tally_result`는 **대립 정도 필터링**에 사용됩니다.

    *   **`validators.json` (검증인 정보):**
        ```json
        [
          {
            "validator_address": "cosmosvaloper1...",
            "moniker": "CosmoStation",
            "chain_id": "cosmos"
          }
        ]
        ```
        *   `moniker`는 **검증인 검색**에 사용됩니다.

    *   **`votes.json` (투표 정보 - 관계 데이터):**
*   **`category_summary.json` (사전 계산된 통계 - 신규 필수):**
    *   **목적:** `FilterPanel`이 요구하는 모든 사전 계산된 통계 정보를 담습니다.
    *   **구조:**
        ```json
        {
          "categories": {
            "SoftwareUpgrade": {
              "count": 15,
              "passRate": 86.7,
              "voteDistribution": { "YES": 500, "NO": 50, ... },
              "votingPowerDistribution": { "YES": 1234567.89, "NO": 12345.67, ... }
            }
          },
          "topics": {
            "Feature Addition": {
              "category": "SoftwareUpgrade",
              "count": 8,
              "passRate": 90.0,
              ...
            }
          }
        }
        ```
        *   이 파일이 없으면 필터 패널의 핵심 기능이 동작하지 않습니다.

        ```json
        [
          {
            "proposal_id": 123,
            "validator_address": "cosmosvaloper1...",
            "vote_option": "Yes"
          }
        ]
        ```
        *   **히트맵**을 그리는 핵심 데이터입니다. 텍스트 중복을 최소화하여 용량을 극적으로 줄입니다.

### 4. 다음 단계

1.  사용자님께서 이 계획을 확인하고 동의합니다.
2.  사용자님께�� 원본 데이터 파일을 제공합니다.
3.  제공된 데이터를 기반으로, 위 설계에 맞춰 데이터를 가공하는 스크립트를 실행하여 `public/data/` 디렉토리를 채웁니다.
4.  새로운 데이터 구조를 사용하도록 API 및 프론트엔드 코드를 수정합니다.

---
