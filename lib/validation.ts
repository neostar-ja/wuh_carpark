import { z } from "zod";

export const CAR_TYPE_OPTIONS = [
  "Small Car",
  "Medium Car",
  "Big Car",
  "Other Types",
] as const;

export const CAR_COLOR_OPTIONS = [
  "White",
  "Black",
  "Silver",
  "Gray",
  "Red",
  "Blue",
  "Green",
  "Brown",
  "Gold",
  "Orange",
  "Yellow",
  "Other",
] as const;

export const LICENSE_PLATE_TYPE_OPTIONS = [
  "ป้ายขาว-ดำ (รถยนต์ส่วนบุคคล)",
  "ป้ายเขียว (รถขนส่ง)",
  "ป้ายเหลือง (รถสาธารณะ)",
  "ป้ายแดง (รถใหม่ยังไม่จดทะเบียน)",
  "อื่นๆ",
] as const;

const LICENSE_PLATE_REGEX = /^[ก-ฮ]{1,3}[0-9]{1,4}$/;
const FULL_NAME_EN_REGEX = /^[A-Za-z\s]+$/;
const FULL_NAME_TH_REGEX = /^[฀-๿\s]+$/;
const PHONE_REGEX = /^0[0-9]{9}$/;

export const registrationSchema = z.object({
  license_plate: z
    .string()
    .trim()
    .min(1, "กรุณากรอกทะเบียนรถ")
    .transform((val) => val.replace(/\s+/g, ""))
    .refine((val) => LICENSE_PLATE_REGEX.test(val), {
      message: "รูปแบบทะเบียนไม่ถูกต้อง (ตัวอย่าง: กข1234)",
    }),
  full_name_th: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ-นามสกุลภาษาไทย")
    .max(100, "ชื่อยาวเกินไป")
    .refine((val) => FULL_NAME_TH_REGEX.test(val), {
      message: "กรุณากรอกเป็นภาษาไทยเท่านั้น (ห้ามมีตัวเลขหรือภาษาอังกฤษ)",
    }),
  full_name_en: z
    .string()
    .trim()
    .min(1, "กรุณากรอกชื่อ-นามสกุลภาษาอังกฤษ")
    .max(100, "ชื่อยาวเกินไป")
    .refine((val) => FULL_NAME_EN_REGEX.test(val), {
      message: "กรุณากรอกเป็นภาษาอังกฤษเท่านั้น (ห้ามมีตัวเลขหรือภาษาไทย)",
    }),
  position: z
    .string()
    .trim()
    .min(1, "กรุณากรอกตำแหน่ง")
    .max(100, "ข้อความยาวเกินไป"),
  department: z
    .string()
    .trim()
    .min(1, "กรุณากรอกหน่วยงาน/แผนก")
    .max(100, "ข้อความยาวเกินไป"),
  phone_number: z
    .string()
    .trim()
    .refine((val) => PHONE_REGEX.test(val), {
      message: "เบอร์โทรศัพท์ต้องเป็นตัวเลข 10 หลัก ขึ้นต้นด้วย 0",
    }),
  car_type: z.enum(CAR_TYPE_OPTIONS, {
    errorMap: () => ({ message: "กรุณาเลือกประเภทรถ" }),
  }),
  car_color: z.enum(CAR_COLOR_OPTIONS, {
    errorMap: () => ({ message: "กรุณาเลือกสีรถ" }),
  }),
  license_plate_type: z.enum(LICENSE_PLATE_TYPE_OPTIONS, {
    errorMap: () => ({ message: "กรุณาเลือกประเภทป้ายทะเบียน" }),
  }),
  consent: z
    .boolean()
    .refine((val) => val === true, { message: "กรุณายืนยันความยินยอมก่อนส่งข้อมูล" }),
});

export type RegistrationInput = z.infer<typeof registrationSchema>;

// Standalone schema for the license-plate-only duplicate-check endpoint.
export const licensePlateCheckSchema = registrationSchema.pick({ license_plate: true });

// Schema for the payload actually sent to the API (client strips consent-only UI concerns off nothing;
// consent is still required server-side to mirror client validation exactly).
export const registrationApiSchema = registrationSchema;

export const statusUpdateSchema = z.object({
  id: z.string().uuid(),
  status: z.enum(["pending", "approved", "rejected"]),
});
