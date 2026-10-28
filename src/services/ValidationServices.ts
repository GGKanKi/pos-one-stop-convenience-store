import z from "zod";

export const LoginSchema = z.object({
  email: z.string().email("Invalid email address"),
});


export const SignupSchema = z.object({
  firstName: z.string().min(2, "First name must be at least 2 characters"),
  lastName: z.string().min(2, "Last name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string()
    .min(15, "Password must be at least 15 characters")
    .max(64, "Password must be no more than 64 characters"),
});

export const PasswordRequirementsMessage = "Use 15 to 64 characters. A passphrase with spaces and special characters is allowed.";
