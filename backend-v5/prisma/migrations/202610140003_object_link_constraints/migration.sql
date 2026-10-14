ALTER TABLE "ObjectResourceLink" ADD CONSTRAINT "ObjectResourceLink_exact_resource"
 CHECK ("resourceType" IN ('document','activity','expense') AND num_nonnulls("documentId","activityId","expenseId")=1);
