# Multi-Year Election Analysis System

## ภาพรวม (Overview)

ระบบนี้ได้รับการปรับปรุงให้รองรับการวิเคราะห์ผลการเลือกตั้งข้ามหลายปี พร้อมฟีเจอร์วิเคราะห์แนวโน้ม (Trend Analysis)

## โครงสร้างข้อมูล (Data Structure)

### ปัจจุบัน
- **ปี 2566**: ข้อมูลจาก API (การเลือกตั้งทั่วไป พ.ศ. 2566)

### วิธีการเพิ่มข้อมูลปีใหม่

#### ขั้นตอนที่ 1: เตรียมข้อมูล

สร้างไฟล์ JSON ในโฟลเดอร์ `public/data/` ตามรูปแบบนี้:

```
public/data/
├── 2566/
│   ├── master-data.json
│   └── result.json
├── 2562/  (ตัวอย่างปีใหม่)
│   ├── master-data.json
│   └── result.json
└── ...
```

#### ขั้นตอนที่ 2: ปรับปรุง DataLoader

แก้ไขไฟล์ `app/Main.tsx` ในส่วน `DataLoader`:

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

        // ดึงข้อมูลปี 2562 จาก local files (ตัวอย่าง)
        const [masterRes2562, resultRes2562] = await Promise.all([
            fetch('/data/2562/master-data.json'),
            fetch('/data/2562/result.json')
        ]);

        const m2562: any = await masterRes2562.json();
        const r2562: any = await resultRes2562.json();

        // Process data สำหรับปี 2566
        const appData2566 = processElectionData(m2566, r2566);
        
        // Process data สำหรับปี 2562
        const appData2562 = processElectionData(m2562, r2562);

        // สร้าง MultiYearData
        const multiYearData: MultiYearData = {
            years: [
                {
                    year: 2562,
                    label: "2562",
                    description: "การเลือกตั้งทั่วไป พ.ศ. 2562",
                    date: "2019-03-24",
                    data: appData2562
                },
                {
                    year: 2566,
                    label: "2566",
                    description: "การเลือกตั้งทั่วไป พ.ศ. 2566",
                    date: "2023-05-14",
                    data: appData2566
                }
            ],
            currentYear: 2566
        };

        onDataLoaded(multiYearData);
    } catch (e: any) { 
        setError(e.message || "An error occurred"); 
    } finally { 
        setIsLoading(false); 
    }
};

// Helper function สำหรับ process data
function processElectionData(masterData: any, resultData: any): AppData {
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
}
```

## ฟีเจอร์ใหม่ (New Features)

### 1. Year Selector
- แสดงปุ่มเลือกปีด้านบนของแต่ละแท็บ (ยกเว้นแท็บ Trends)
- สามารถสลับดูข้อมูลแต่ละปีได้อย่างรวดเร็ว

### 2. Trend Analysis Tab
- **แนวโน้มการลงคะแนน**: กราฟเส้นแสดงอัตราการลงคะแนนและจำนวนคะแนนเสียงรวมข้ามปี
- **เปรียบเทียบที่นั่งรายพรรค**: กราฟแท่งเปรียบเทียบจำนวนที่นั่งของแต่ละพรรคข้ามปี
- **Key Insights**: 
  - Turnout Change: การเปลี่ยนแปลงอัตราการลงคะแนน
  - Vote Change: การเปลี่ยนแปลงจำนวนคะแนนเสียง
  - Biggest Gainer: พรรคที่ได้ที่นั่งเพิ่มขึ้นมากที่สุด
  - Biggest Loser: พรรคที่เสียที่นั่งมากที่สุด
- **ตารางรายละเอียด**: แสดงจำนวนที่นั่งของแต่ละพรรคในแต่ละปี พร้อมการเปลี่ยนแปลง

## รูปแบบข้อมูล (Data Format)

### ElectionYear
```typescript
interface ElectionYear {
    year: number;           // ปี พ.ศ. เช่น 2566
    label: string;          // ป้ายกำกับ เช่น "2566"
    description: string;    // คำอธิบาย เช่น "การเลือกตั้งทั่วไป พ.ศ. 2566"
    date: string;          // วันที่เลือกตั้ง ISO format
    data: AppData;         // ข้อมูลการเลือกตั้งทั้งหมด
}
```

### MultiYearData
```typescript
interface MultiYearData {
    years: ElectionYear[];  // รายการข้อมูลแต่ละปี
    currentYear: number;    // ปีปัจจุบันที่เลือก
}
```

## การใช้งาน (Usage)

### เพิ่มข้อมูลปีใหม่แบบง่าย

1. **วางไฟล์ข้อมูล** ใน `public/data/[year]/`
2. **แก้ไข DataLoader** เพิ่มการดึงข้อมูลปีใหม่
3. **เพิ่ม ElectionYear object** ใน array `years`
4. **ระบุ currentYear** ที่ต้องการให้แสดงเป็นค่าเริ่มต้น

### ตัวอย่างการเพิ่มปี 2560

```typescript
const multiYearData: MultiYearData = {
    years: [
        {
            year: 2560,
            label: "2560",
            description: "การเลือกตั้งทั่วไป พ.ศ. 2560",
            date: "2017-XX-XX",
            data: appData2560
        },
        {
            year: 2562,
            label: "2562",
            description: "การเลือกตั้งทั่วไป พ.ศ. 2562",
            date: "2019-03-24",
            data: appData2562
        },
        {
            year: 2566,
            label: "2566",
            description: "การเลือกตั้งทั่วไป พ.ศ. 2566",
            date: "2023-05-14",
            data: appData2566
        }
    ],
    currentYear: 2566
};
```

## หมายเหตุ (Notes)

- ข้อมูลควรเรียงตามปีจากน้อยไปมาก (เก่าไปใหม่)
- Trend Analysis จะแสดงเฉพาะเมื่อมีข้อมูลอย่างน้อย 2 ปี
- การเปรียบเทียบพรรคจะแสดงเฉพาะ Top 10 พรรค
- Year Selector จะซ่อนเมื่ออยู่ในแท็บ Trends หรือมีข้อมูลแค่ปีเดียว

## การพัฒนาต่อ (Future Development)

### แนะนำ
1. **Automatic Data Sync**: ดึงข้อมูลจาก API อัตโนมัติเมื่อมีการเลือกตั้งใหม่
2. **Data Caching**: เก็บข้อมูลใน localStorage เพื่อลดการโหลด
3. **Advanced Predictions**: ใช้ Machine Learning วิเคราะห์แนวโน้มและทำนายผล
4. **Regional Trends**: วิเคราะห์แนวโน้มรายภาค/จังหวัด
5. **Export Reports**: ส่งออกรายงานเป็น PDF/Excel

## ตัวอย่างโครงสร้างไฟล์ (File Structure Example)

```
jomsuksit-admin/
├── app/
│   ├── Main.tsx                    # Main component with multi-year support
│   ├── TrendAnalysis.tsx           # Trend analysis component
│   ├── types.ts                    # Type definitions
│   ├── EnhancedOverview.tsx
│   ├── EnhancedRegionalAnalysis.tsx
│   ├── EnhancedPartyAnalysis.tsx
│   └── ...
├── public/
│   └── data/
│       ├── 2562/
│       │   ├── master-data.json
│       │   └── result.json
│       ├── 2566/
│       │   ├── master-data.json
│       │   └── result.json
│       └── ...
└── ...
```

## สรุป

ระบบได้รับการปรับปรุงให้:
- ✅ รองรับข้อมูลหลายปี
- ✅ มี Year Selector สำหรับสลับดูข้อมูลแต่ละปี
- ✅ มีแท็บ Trend Analysis สำหรับวิเคราะห์แนวโน้ม
- ✅ แสดงการเปลี่ยนแปลงของพรรคการเมืองข้ามปี
- ✅ พร้อมสำหรับการเพิ่มข้อมูลปีใหม่ในอนาคต
