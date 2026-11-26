import type {
  Course,
  CourseCardData,
  Department,
  University,
} from "../app/courses/presentation.js"

export const SAMPLE_UNIVERSITIES: University[] = [
  { id: "uni_aau", name: "Addis Ababa University" },
  { id: "uni_astu", name: "Adama Science and Technology University" },
]

export const SAMPLE_DEPARTMENTS: Department[] = [
  { id: "dept_cs", name: "Computer Science", universityId: "uni_aau" },
  { id: "dept_math", name: "Mathematics", universityId: "uni_aau" },
  { id: "dept_phys", name: "Physics", universityId: "uni_aau" },
  { id: "dept_se", name: "Software Engineering", universityId: "uni_astu" },
]

export const SAMPLE_COURSES: Course[] = [
  {
    id: "course_cs101",
    code: "CS101",
    name: "Introduction to Computer Science",
    universityId: "uni_aau",
    departmentId: "dept_cs",
  },
  {
    id: "course_cs201",
    code: "CS201",
    name: "Data Structures and Algorithms",
    universityId: "uni_aau",
    departmentId: "dept_cs",
  },
  {
    id: "course_math101",
    code: "MATH101",
    name: "Calculus I",
    universityId: "uni_aau",
    departmentId: "dept_math",
  },
  {
    id: "course_se301",
    code: "SE301",
    name: "Software Architecture",
    universityId: "uni_astu",
    departmentId: "dept_se",
  },
]

export const SAMPLE_COURSE_CARDS: CourseCardData[] = [
  {
    id: "c-cs101",
    name: "Introduction to Computer Science",
    code: "CS101",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-cs",
    departmentName: "Computer Science",
    materialsCount: 15,
    questionsCount: 22,
  },
  {
    id: "c-cs201",
    name: "Data Structures and Algorithms",
    code: "CS201",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-cs",
    departmentName: "Computer Science",
    materialsCount: 0, // Edge case: 0 materials
    questionsCount: 8,
  },
  {
    id: "c-math101",
    name: "Calculus I",
    code: "MATH101",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-math",
    departmentName: "Mathematics",
    materialsCount: 9,
    questionsCount: 0, // Edge case: 0 Q&As
  },
  {
    id: "c-ast101",
    name: "Introduction to Astronomy",
    code: "AST101",
    universityId: "u-aau",
    universityName: "Addis Ababa University",
    departmentId: "d-phys",
    departmentName: "Physics",
    materialsCount: 0, // Edge case: 0 materials and 0 Q&As
    questionsCount: 0,
  },
  {
    id: "c-se301",
    name: "Software Architecture",
    code: "SE301",
    universityId: "u-astu",
    universityName: "Adama Science and Technology University",
    departmentId: "d-se",
    departmentName: "Software Engineering",
    materialsCount: 28,
    questionsCount: 14,
  },
]
