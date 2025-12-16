# ตัวอย่างการเพิ่มข้อมูลปี 2562

## ขั้นตอนที่ 1: เตรียมไฟล์ข้อมูล

สร้างโฟลเดอร์และไฟล์ตามโครงสร้างนี้:

```
public/data/2562/
├── master-data.json
└── result.json
```

## ขั้นตอนที่ 2: แก้ไข Main.tsx

เปิดไฟล์ `app/Main.tsx` และแก้ไขฟังก์ชัน `fetchData` ใน `DataLoader`:

### ก่อนแก้ไข (ปัจจุบัน):

```typescript
const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
        const [masterRes, resultRes] = await Promise.all([
            fetch(API_URLS.MASTER),
            fetch(API_URLS.RESULT)
        ]);

        if (!masterRes.ok || !resultRes.ok) throw new Error("Failed to connect to Data API");

        const m: any = await masterRes.json();
        const r: any = await resultRes.json();

        // Process Data
        const regions: Region[] = Object.values(m.regions || {}).map((v: any) => v as Region);
        // ... (code continues)

        const appData: AppData = {
            regions, 
            provinces, 
            parties, 
            candidates, 
            partyStats,
            electionAreas: (m.electionAreas || []) as ElectionArea[],
            electionScores: (r.electionScores || {}) as ElectionScores
        };

        const electionYear: ElectionYear = {
            year: 2566,
            label: "2566",
            description: "การเลือกตั้งทั่วไป พ.ศ. 2566",
            date: "2023-05-14",
            data: appData
        };

        const multiYearData: MultiYearData = {
            years: [electionYear],
            currentYear: 2566
        };

        onDataLoaded(multiYearData);
    } catch (e: any) { 
        setError(e.message || "An error occurred"); 
    } finally { 
        setIsLoading(false); 
    }
};
```

### หลังแก้ไข (เพิ่มปี 2562):

```typescript
const fetchData = async () => {
    setIsLoading(true);
    setError("");
    try {
        // ดึงข้อมูลปี 2566 จาก API
        const [masterRes2566, resultRes2566] = await Promise.all([
            fetch(API_URLS.MASTER),
            fetch(API_URLS.RESULT)
        ]);

        if (!masterRes2566.ok || !resultRes2566.ok) 
            throw new Error("Failed to connect to Data API");

        const m2566: any = await masterRes2566.json();
        const r2566: any = await resultRes2566.json();

        // ดึงข้อมูลปี 2562 จาก local files
        const [masterRes2562, resultRes2562] = await Promise.all([
            fetch('/data/2562/master-data.json'),
            fetch('/data/2562/result.json')
        ]);

        if (!masterRes2562.ok || !resultRes2562.ok) {
            console.warn("Failed to load 2562 data, continuing with 2566 only");
        }

        const m2562: any = masterRes2562.ok ? await masterRes2562.json() : null;
        const r2562: any = resultRes2562.ok ? await resultRes2562.json() : null;

        // Helper function สำหรับ process data
        const processElectionData = (masterData: any, resultData: any): AppData => {
            const regions: Region[] = Object.values(masterData.regions || {}).map((v: any) => v as Region);
            const provinces: Province[] = (masterData.provinces || []) as Province[];
            const parties: Party[] = Object.values(masterData.parties || {}).map((v: any) => ({
                ...v, 
                id: parseInt(v.id || 0)
            })) as Party[];
            const partyMap = new Map(parties.map(p => [p.id, p]));
            
            const scoreMap = new Map<number, number>();
            (resultData.areaBallotScores || []).forEach((area: any) => {
                if(area.candidates) {
                    area.candidates.forEach((c: any) => scoreMap.set(c.id, c.totalVotes));
                }
            });

            const candidates: Candidate[] = (masterData.candidates || []).map((c: any) => ({
                ...c,
                score: scoreMap.get(c.id) || 0,
                partyName: partyMap.get(c.partyId)?.name || 'N/A',
                partyColor: partyMap.get(c.partyId)?.color || '#ccc'
            })) as Candidate[];

            const partyStats: PartyStats[] = Object.values(resultData.partyScores || {})
                .map((s: any) => ({
                    ...s, 
                    ...(partyMap.get(s.id) || {}),
                    totalSeat: (s.areaSeats || 0) + (s.partyListSeats || 0)
                }))
                .sort((a: any, b: any) => b.totalSeat - a.totalSeat) as PartyStats[];

            return {
                regions, 
                provinces, 
                parties, 
                candidates, 
                partyStats,
                electionAreas: (masterData.electionAreas || []) as ElectionArea[],
                electionScores: (resultData.electionScores || {}) as ElectionScores
            };
        };

        // Process data สำหรับปี 2566
        const appData2566 = processElectionData(m2566, r2566);
        
        // สร้าง years array
        const years: ElectionYear[] = [
            {
                year: 2566,
                label: "2566",
                description: "การเลือกตั้งทั่วไป พ.ศ. 2566",
                date: "2023-05-14",
                data: appData2566
            }
        ];

        // เพิ่มปี 2562 ถ้ามีข้อมูล
        if (m2562 && r2562) {
            const appData2562 = processElectionData(m2562, r2562);
            years.unshift({  // เพิ่มไว้ข้างหน้า (เรียงจากเก่าไปใหม่)
                year: 2562,
                label: "2562",
                description: "การเลือกตั้งทั่วไป พ.ศ. 2562",
                date: "2019-03-24",
                data: appData2562
            });
        }

        const multiYearData: MultiYearData = {
            years,
            currentYear: 2566  // ค่าเริ่มต้นแสดงปี 2566
        };

        onDataLoaded(multiYearData);
    } catch (e: any) { 
        setError(e.message || "An error occurred"); 
    } finally { 
        setIsLoading(false); 
    }
};
```

## ขั้นตอนที่ 3: ทดสอบ

1. วางไฟล์ข้อมูลปี 2562 ใน `public/data/2562/`
2. Restart dev server: `npm run dev`
3. เปิดแอพและกด "Connect Live Data"
4. ตรวจสอบว่า:
   - Year Selector ปรากฏขึ้น
   - สามารถสลับระหว่างปี 2562 และ 2566 ได้
   - แท็บ Trends แสดงการวิเคราะห์แนวโน้ม

## ตัวอย่างโครงสร้างข้อมูล

### master-data.json (ตัวอย่างย่อ)
```json
{
  "regions": {
    "1": { "id": 1, "name": "กรุงเทพมหานคร" },
    "2": { "id": 2, "name": "ภาคกลาง" }
  },
  "provinces": [
    { "id": 1, "name": "กรุงเทพมหานคร", "regionId": 1 },
    { "id": 2, "name": "นนทบุรี", "regionId": 2 }
  ],
  "parties": {
    "1": { "id": "1", "name": "พรรค A", "color": "#FF0000" },
    "2": { "id": "2", "name": "พรรค B", "color": "#0000FF" }
  },
  "electionAreas": [
    { "id": 1, "name": "เขต 1", "provinceId": 1, "areaNo": 1 }
  ],
  "candidates": [
    {
      "id": 1,
      "fullName": "นาย A",
      "partyId": 1,
      "electionAreaId": 1
    }
  ]
}
```

### result.json (ตัวอย่างย่อ)
```json
{
  "electionScores": {
    "1": {
      "totalVotes": 30000000,
      "percentVoter": 75.5
    }
  },
  "partyScores": {
    "1": {
      "id": 1,
      "areaSeats": 100,
      "partyListSeats": 50
    }
  },
  "areaBallotScores": [
    {
      "areaId": 1,
      "candidates": [
        {
          "id": 1,
          "totalVotes": 50000
        }
      ]
    }
  ]
}
```

## หมายเหตุสำคัญ

1. **ลำดับปี**: ควรเรียงจากเก่าไปใหม่ในอาร์เรย์ `years`
2. **Error Handling**: ถ้าโหลดข้อมูลปีเพิ่มเติมไม่สำเร็จ ระบบจะใช้เฉพาะปี 2566
3. **Party ID Mapping**: ต้องแน่ใจว่า Party ID ตรงกันในทุกปี
4. **Data Validation**: ควรตรวจสอบความถูกต้องของข้อมูลก่อนนำเข้า

## การเพิ่มปีที่ 3, 4, 5...

ใช้รูปแบบเดียวกัน:

```typescript
// เพิ่มปี 2560
const [masterRes2560, resultRes2560] = await Promise.all([
    fetch('/data/2560/master-data.json'),
    fetch('/data/2560/result.json')
]);

if (m2560 && r2560) {
    const appData2560 = processElectionData(m2560, r2560);
    years.unshift({
        year: 2560,
        label: "2560",
        description: "การเลือกตั้งทั่วไป พ.ศ. 2560",
        date: "2017-XX-XX",
        data: appData2560
    });
}
```

## ทางเลือกอื่น: ใช้ Config File

สร้างไฟล์ `public/data/elections.json`:

```json
{
  "elections": [
    {
      "year": 2560,
      "label": "2560",
      "description": "การเลือกตั้งทั่วไป พ.ศ. 2560",
      "date": "2017-XX-XX",
      "dataPath": "/data/2560"
    },
    {
      "year": 2562,
      "label": "2562",
      "description": "การเลือกตั้งทั่วไป พ.ศ. 2562",
      "date": "2019-03-24",
      "dataPath": "/data/2562"
    }
  ]
}
```

แล้วโหลดแบบ dynamic:

```typescript
const configRes = await fetch('/data/elections.json');
const config = await configRes.json();

const years: ElectionYear[] = [];

for (const election of config.elections) {
    const [masterRes, resultRes] = await Promise.all([
        fetch(`${election.dataPath}/master-data.json`),
        fetch(`${election.dataPath}/result.json`)
    ]);
    
    if (masterRes.ok && resultRes.ok) {
        const m = await masterRes.json();
        const r = await resultRes.json();
        const appData = processElectionData(m, r);
        
        years.push({
            year: election.year,
            label: election.label,
            description: election.description,
            date: election.date,
            data: appData
        });
    }
}

// เพิ่มปี 2566 จาก API
const appData2566 = processElectionData(m2566, r2566);
years.push({
    year: 2566,
    label: "2566",
    description: "การเลือกตั้งทั่วไป พ.ศ. 2566",
    date: "2023-05-14",
    data: appData2566
});
```

วิธีนี้จะทำให้เพิ่มข้อมูลปีใหม่ได้ง่ายขึ้น โดยแค่เพิ่มข้อมูลใน config file และวางไฟล์ข้อมูลในโฟลเดอร์ที่กำหนด
