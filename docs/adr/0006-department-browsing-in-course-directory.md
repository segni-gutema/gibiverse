# Department browsing in course directory and dedicated course details hub

Department filtering and grouping are restored as student-facing discovery dimensions in the Course Directory (`/courses`), while fast-action creation pickers remain direct University-to-Course per ADR 0005.

Students browsing the academic catalog often think in terms of their major or field of study (e.g. Computer Science, Mathematics, Electrical Engineering). To reduce friction when exploring courses, `/courses` provides cascading University and Department dropdown selectors alongside instant text search and sorting controls. Selecting a University scopes available Department options, and changing University auto-resets incompatible selections.

Creation pickers (e.g. Upload Course Material wizard and Ask Question dialog) retain the direct University-to-Course flow established in ADR 0005 to avoid unnecessary form steps during quick contributions. When initiated from a dedicated Course Details page (`/courses/[id]`), both University and Course are automatically pre-selected.
