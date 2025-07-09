export interface PainArea {
  id: string; 
  region: string;
  intensity: number;
  notes?: string; // e.g., "View: front, RegionID: 1, Detail: Forehead/Face (Front)"
  coordinates?: { x: number; y: number }; 
}

export interface Surgery {
  date: string;
  procedure: string;
  surgeon: string;
  hospital: string;
}

export interface Imaging {
  type: 'X-Ray' | 'MRI' | 'CT Scan' | 'CT Myelogram' | 'EMG/Nerve Conduction';
  hadStudy: boolean;
  clinic?: string;
  date?: string;
  document?: File; // For the file input
  documentName?: string; // To store the path/name of the uploaded file from server
}

// New interface for a generic red flag item
export interface RedFlagSeverityItem {
  present: boolean; // Does the user experience this?
  severity?: number; // 1-10, for the slider. This will be moved to area-specific for some items.
}

// For symptoms like muscle weakness/numbness where multiple areas can be selected
export interface AreaSpecificSymptomDetail {
  selected: boolean;
  // severity?: number; // Severity for this specific area - REMOVED
}

export type MuscleWeaknessArea = 'Arms' | 'Legs' | 'Hands' | 'Feet' | 'Trunk/Core' | 'OtherMuscleArea';
export type NumbnessArea = 'Arms' | 'Legs' | 'Hands' | 'Feet' | 'Face' | 'Trunk/Body' | 'OtherNumbnessArea';
// Add other area types if needed, e.g., for bladder/saddle if they become multi-area with severity

export interface AreaSpecificSymptoms {
  [area: string]: AreaSpecificSymptomDetail; // e.g., "Arms": { selected: true, severity: 5 }
}

// Updated interface for a red flag item that might have area-specific details or a single detail list
export interface RedFlagDetailedItem extends RedFlagSeverityItem { // present is still top-level
  details?: string; // For single-select dropdowns (like Bladder/Saddle) - Changed to string
  areas?: AreaSpecificSymptoms; // For multi-checkbox with per-area severity (Muscle/Numbness)
  severity?: number; // Optional top-level severity for items NOT using 'areas' but needing severity (e.g. Bladder/Saddle if they had a slider)
  isNewOnset?: boolean; // Added for incontinence
}


// New interface for Unexplained Weight Loss
export interface RedFlagWeightLossItem {
  present: boolean;
  period?: string; // e.g., "last 3 months"
  amountKg?: number; 
}

// Interface for the "Red Flags" section
export interface RedFlagsData {
  muscleWeakness: RedFlagDetailedItem;
  numbnessOrTingling: RedFlagDetailedItem;
  // feverOrRecentInfection: RedFlagSeverityItem; // Removed
  unexplainedWeightLoss: RedFlagWeightLossItem;
  bladderOrBowelIncontinence: RedFlagDetailedItem; // Will use 'details' for its single dropdown
  saddleAnaesthesia: RedFlagDetailedItem; // Will use 'details' for its single dropdown
  balanceProblems: { // Changed from string to object
    present: boolean;
    type?: string; // Stores the selected radio option if present is true
  };
  // onsetIncontinence: { present: boolean }; // REMOVED - will be part of bladderOrBowelIncontinence
  otherRedFlagPresent?: boolean;
  otherRedFlag?: string;
}

export interface Address {
  addressLine1: string;
  addressLine2?: string;
  suburb: string;
  state: string;
  postcode: string;
}

export interface Funding {
  source: 'Private Health Insurance' | 'Workers Compensation' | 'DVA' | 'TAC' | 'Paying myself' | 'Other' | '';
  healthFundName?: string;
  membershipNumber?: string;
  claimNumber?: string;
  otherSource?: string;
}

export interface NextOfKin {
  fullName: string;
  relationship: string;
  phoneNumber: string;
}

export interface ReferringDoctor {
  hasReferringDoctor: boolean | null;
  doctorName?: string;
  clinic?: string;
  phoneNumber?: string;
  email?: string;
  fax?: string;
}

export interface Demographics {
  fullName: string;
  dateOfBirth: string;
  phoneNumber: string;
  email: string;
  residentialAddress: Address;
  isPostalSameAsResidential: boolean;
  postalAddress?: Address;
  funding: Funding;
  nextOfKin: NextOfKin;
  referringDoctor: ReferringDoctor;
  gender?: string;
  medicareNumber?: string;
  medicareRefNum?: string; // New field for the number next to the name
  countryOfBirth?: string;
}

export interface FormData {
  // Step 1: Onboarding
  consent: boolean;

  // Step 2: Medical History
  diagnoses: {
    herniatedDisc: boolean;
    spinalStenosis: boolean;
    spondylolisthesis: boolean;
    scoliosis: boolean;
    spinalFracture: boolean;
    degenerativeDiscDisease: boolean;
    otherConditionSelected?: boolean; // Tracks if "Other" radio is Yes
    other?: string; // Text for other condition
    // New fields for symptom duration and progression
    symptomDuration?: string; 
    symptomProgression?: 'Getting better' | 'Staying the same' | 'Getting worse' | ''; 
    mainSymptoms?: string; // Added for the new question
  };

  // Step 3: Treatments & Surgery History
  treatments: {
    overTheCounterMedication: boolean;
    prescriptionAntiInflammatory: boolean;
    prescriptionAntiInflammatoryName?: string;
    prescriptionPainMedication: boolean;
    prescriptionPainMedicationName?: string;
    spinalInjections: boolean;
    spinalInjectionsDetails?: string;
    physiotherapy: boolean;
    chiropracticTreatment: boolean;
    osteopathyMyotherapy: boolean;
  };
  hadSurgery: boolean;
  surgeries: Surgery[];

  // Step 4: Imaging History
  imaging: Imaging[];
  imagingRecordsPermission: boolean; // New field for permission

  // Step 5: Pain Mapping
  painAreas: PainArea[];
  // painDescription?: string; // This field will be REMOVED
  redFlags: RedFlagsData; // NEW field for Red Flags

  // Step 6: Demographics
  demographics: Demographics;

  // New field for treatment goals, from PainMappingStep
  treatmentGoals?: string;

  // New fields for pain map images
  formSessionId?: string;
  painMapImageFront?: string;
  painMapImageBack?: string;
  nextStep?: string;
  systemRecommendation?: string;
}

export const initialFormData: FormData = {
  consent: false,

  diagnoses: {
    herniatedDisc: false,
    spinalStenosis: false,
    spondylolisthesis: false,
    scoliosis: false,
    spinalFracture: false,
    degenerativeDiscDisease: false,
    otherConditionSelected: false,
    other: '',
    symptomDuration: '',
    symptomProgression: '',
    mainSymptoms: '',
  },

  treatments: {
    overTheCounterMedication: false,
    prescriptionAntiInflammatory: false,
    prescriptionPainMedication: false,
    spinalInjections: false,
    physiotherapy: false,
    chiropracticTreatment: false,
    osteopathyMyotherapy: false,
  },
  hadSurgery: false,
  surgeries: [],

  imaging: [
    { type: 'X-Ray', hadStudy: false, clinic: '', date: '' },
    { type: 'MRI', hadStudy: false, clinic: '', date: '' },
    { type: 'CT Scan', hadStudy: false, clinic: '', date: '' },
    { type: 'CT Myelogram', hadStudy: false, clinic: '', date: '' },
    { type: 'EMG/Nerve Conduction', hadStudy: false, clinic: '', date: '' },
  ],

  painAreas: [],
  // painDescription: '', // This initialization will be REMOVED
  redFlags: {
    muscleWeakness: { 
      present: false, 
      areas: {
        'Arms': { selected: false }, // Severity removed
        'Legs': { selected: false }, // Severity removed
        'Hands': { selected: false }, // Severity removed
        'Feet': { selected: false }, // Severity removed
        'Trunk/Core': { selected: false }, // Severity removed
        'OtherMuscleArea': { selected: false }, // Severity removed
      } 
    },
    numbnessOrTingling: { 
      present: false, 
      areas: {
        'Arms': { selected: false }, // Severity removed
        'Legs': { selected: false }, // Severity removed
        'Hands': { selected: false }, // Severity removed
        'Feet': { selected: false }, // Severity removed
        'Face': { selected: false }, // Severity removed
        'Trunk/Body': { selected: false }, // Severity removed
        'OtherNumbnessArea': { selected: false }, // Severity removed
      }
    },
    unexplainedWeightLoss: { present: false, period: '', amountKg: undefined },
    bladderOrBowelIncontinence: { present: false, details: '', isNewOnset: false }, // Severity removed, isNewOnset added
    saddleAnaesthesia: { present: false, details: '' }, // Severity removed
    balanceProblems: { present: false, type: '' }, // Changed structure
    // onsetIncontinence: { present: false }, // REMOVED
    otherRedFlagPresent: false,
    otherRedFlag: '',
  },
  treatmentGoals: '',
  imagingRecordsPermission: false, // Initialize new field

  demographics: {
    fullName: '',
    dateOfBirth: '',
    phoneNumber: '',
    email: '',
    residentialAddress: {
      addressLine1: '',
      suburb: '',
      state: '',
      postcode: '',
    },
    isPostalSameAsResidential: true,
    funding: {
      source: '',
    },
    nextOfKin: {
      fullName: '',
      relationship: '',
      phoneNumber: '',
    },
    referringDoctor: {
      hasReferringDoctor: null,
    },
    medicareRefNum: '', // Initialize new field
  },
  formSessionId: `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
  painMapImageFront: '',
  painMapImageBack: '',
  nextStep: '',
  systemRecommendation: '',
};
