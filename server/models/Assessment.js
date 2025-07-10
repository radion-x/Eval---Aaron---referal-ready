const mongoose = require('mongoose');

const addressSchema = new mongoose.Schema({
  addressLine1: String,
  addressLine2: String,
  suburb: String,
  state: String,
  postcode: String,
}, { _id: false });

const assessmentSchema = new mongoose.Schema({
  consent: Boolean,
  diagnoses: {
    herniatedDisc: Boolean,
    spinalStenosis: Boolean,
    spondylolisthesis: Boolean,
    scoliosis: Boolean,
    spinalFracture: Boolean,
    degenerativeDiscDisease: Boolean,
    otherConditionSelected: Boolean,
    other: String,
    mainSymptoms: String,
    symptomDuration: String,
    symptomProgression: String,
  },
  treatments: {
    overTheCounterMedication: Boolean,
    prescriptionAntiInflammatory: Boolean,
    prescriptionAntiInflammatoryName: String,
    prescriptionPainMedication: Boolean,
    prescriptionPainMedicationName: String,
    spinalInjections: Boolean,
    spinalInjectionsDetails: String,
    physiotherapy: Boolean,
    chiropracticTreatment: Boolean,
    osteopathyMyotherapy: Boolean,
  },
  hadSurgery: Boolean,
  surgeries: [{ date: String, procedure: String, surgeon: String, hospital: String }],
  imaging: [{
    type: { type: String },
    hadStudy: Boolean,
    clinic: String,
    date: String,
    documentName: String,
  }],
  imagingRecordsPermission: Boolean,
  painAreas: [{ id: String, region: String, intensity: Number, notes: String, coordinates: { x: Number, y: Number } }],
  redFlags: {
    muscleWeakness: { present: Boolean, areas: mongoose.Schema.Types.Mixed },
    numbnessOrTingling: { present: Boolean, areas: mongoose.Schema.Types.Mixed },
    unexplainedWeightLoss: { present: Boolean, period: String, amountKg: Number },
    bladderOrBowelIncontinence: { present: Boolean, severity: Number, details: String },
    saddleAnaesthesia: { present: Boolean, severity: Number, details: String },
    balanceProblems: { present: { type: Boolean, default: false }, type: { type: String, default: '' } },
    otherRedFlagPresent: Boolean,
    otherRedFlag: String,
  },
  demographics: {
    fullName: String,
    dateOfBirth: String,
    phoneNumber: String,
    email: String,
    residentialAddress: addressSchema,
    isPostalSameAsResidential: Boolean,
    postalAddress: addressSchema,
    funding: {
      source: String,
      healthFundName: String,
      membershipNumber: String,
      claimNumber: String,
      otherSource: String,
    },
    nextOfKin: {
      fullName: String,
      relationship: String,
      phoneNumber: String,
    },
    referringDoctor: {
      hasReferringDoctor: Boolean,
      doctorName: String,
      clinic: String,
      phoneNumber: String,
      email: String,
      fax: String,
    },
    gender: String,
    medicareNumber: String,
    medicareRefNum: String,
    countryOfBirth: String,
  },
  aiSummary: String,
  treatmentGoals: String,
  painMapImageFront: { type: String },
  painMapImageBack: { type: String },
  nextStep: { type: String },
  recommendationText: { type: String },
  systemRecommendation: { type: String },
  createdAt: { type: Date, default: Date.now },
  updatedAt: { type: Date, default: Date.now },
});

assessmentSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

const Assessment = mongoose.model('Assessment', assessmentSchema);

module.exports = Assessment;
