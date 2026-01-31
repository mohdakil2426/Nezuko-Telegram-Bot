# 6. Form Handling & Validation

## 6.1 react-hook-form + Zod Integration

**RULE:** Always use **react-hook-form** with **Zod** for form handling and validation. Form data MUST be validated on both client and server.

**Architecture:**
1. Define Zod schema (source of truth)
2. Use `useForm` with Zod resolver
3. Server Action performs same validation
4. Type-safe throughout

**✅ DO:**
```typescript
// lib/schemas/user.ts
import { z } from "zod";

export const updateUserSchema = z.object({
  name: z.string().min(1, "Name is required").max(100),
  email: z.string().email("Invalid email"),
  bio: z.string().max(500).optional(),
  preferences: z.object({
    newsletter: z.boolean().default(true),
    notifications: z.boolean().default(true),
  }),
});

export type UpdateUserInput = z.infer<typeof updateUserSchema>;

// app/actions/user.ts
"use server";

import { revalidatePath } from "next/cache";
import { updateUserSchema } from "@/lib/schemas/user";

export async function updateUser(input: UpdateUserInput) {
  // Server-side validation
  const validated = updateUserSchema.parse(input);
  
  const session = await getSession();
  if (!session?.user) throw new Error("Unauthorized");
  
  // Update database
  const updatedUser = await db.user.update({
    where: { id: session.user.id },
    data: validated,
  });
  
  revalidatePath("/settings");
  return updatedUser;
}

// app/settings/edit-profile-form.tsx
"use client";

import { ReactNode } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { updateUserSchema, type UpdateUserInput } from "@/lib/schemas/user";
import { updateUser } from "@/app/actions/user";

export function EditProfileForm(): ReactNode {
  const form = useForm<UpdateUserInput>({
    resolver: zodResolver(updateUserSchema),
    defaultValues: {
      name: "",
      email: "",
      bio: "",
      preferences: {
        newsletter: true,
        notifications: true,
      },
    },
  });
  
  const onSubmit = async (data: UpdateUserInput) => {
    try {
      await updateUser(data);
      form.reset(data);
    } catch (error) {
      form.setError("root", {
        message: error instanceof Error ? error.message : "Something went wrong",
      });
    }
  };
  
  return (
    <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
      <div>
        <label>Name</label>
        <input
          {...form.register("name")}
          type="text"
          className={form.formState.errors.name ? "error" : ""}
        />
        {form.formState.errors.name && (
          <span className="error">{form.formState.errors.name.message}</span>
        )}
      </div>
      
      <div>
        <label>Email</label>
        <input {...form.register("email")} type="email" />
        {form.formState.errors.email && (
          <span className="error">{form.formState.errors.email.message}</span>
        )}
      </div>
      
      <div>
        <label>Bio</label>
        <textarea {...form.register("bio")} />
      </div>
      
      <div>
        <label>
          <input {...form.register("preferences.newsletter")} type="checkbox" />
          Subscribe to newsletter
        </label>
      </div>
      
      {form.formState.errors.root && (
        <div className="error">{form.formState.errors.root.message}</div>
      )}
      
      <button
        type="submit"
        disabled={form.formState.isSubmitting}
      >
        {form.formState.isSubmitting ? "Saving..." : "Save"}
      </button>
    </form>
  );
}
```

**❌ DON'T:**
```typescript
// Manual validation
const [errors, setErrors] = useState({});
const handleSubmit = (e) => {
  if (!email.includes("@")) setErrors({ email: "Invalid" });
  // No server validation!
};

// Validation on client only
if (!name || name.length < 1) {
  return <span>Name required</span>;
}
// Server doesn't validate - security risk!

// Multiple sources of truth
const schema = z.object({ email: z.string().email() });
// And in form... different validation logic
```

## 6.2 Form State Management

**RULE:** Use `react-hook-form`'s built-in state. Don't duplicate form state in Zustand or useState.

**✅ DO:**
```typescript
const form = useForm<FormData>({
  resolver: zodResolver(schema),
});

// Access everything from form object
form.formState.isSubmitting
form.formState.isValid
form.formState.isDirty
form.formState.errors
form.watch() // Subscribe to changes
form.setValue() // Update values programmatically
```

**❌ DON'T:**
```typescript
// Duplicating state
const form = useForm<FormData>({ ... });
const [isSubmitting, setIsSubmitting] = useState(false);
useEffect(() => {
  setIsSubmitting(form.formState.isSubmitting);
}, [form.formState.isSubmitting]);

// Storing form data in global state
const { formData, setFormData } = useFormStore();
const form = useForm({ defaultValues: formData });
```

---

[← Back to Data Fetching](./06-data-fetching.md) | [Next: Styling & Design System →](./08-styling-design-system.md)
