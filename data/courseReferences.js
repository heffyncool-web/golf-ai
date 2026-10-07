export const GRACE_REFERENCE_SOURCES=[
 {id:"course-summary-2026",label:"27홀 코스 구성·전장 교차검증",url:"https://papahun.com/cheongdograce-cc-course/",checked:"2026-10-08",scope:"Lake/Mountain/Valley 구성 및 코스 전장",level:"reference"},
 {id:"field-photos",label:"Lake·Mountain 홀별 현장사진 교차검증",url:"https://sgh4609.tistory.com/2610?category=1003467",checked:"2026-10-08",scope:"Lake 1~9 및 Mountain 홀 전경",level:"reference"}
];
export function graceReferenceStatus(courseName,hole){
 const course=/mountain/i.test(courseName)?"Mountain":/lake/i.test(courseName)?"Lake":courseName;
 return {course,hole,referenceCount:GRACE_REFERENCE_SOURCES.length,status:"공개자료 교차검증",geometryStatus:"현장 GPS 검증 필요"};
}
