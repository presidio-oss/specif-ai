export const BRD_DEFINITION_CONTEXT = `A business requirement is a detailed description of the needs and objectives that a business aims to achieve through the project. These requirements guide the project's direction,
ensure alignment with strategic goals, manage expectations, and define metrics for success, thus providing a clear roadmap for project execution and stakeholder engagement.
- Identify the high-level business needs and objectives of the application for solving the business problem.
- Consider the business context and target audience/ users of the application.
- Focus on the strategic outcomes and benefits for the business objectives.`;

export const BRD_CONTEXT = `${BRD_DEFINITION_CONTEXT}

Instructions:
- Generate an apt title for all the following requirements. The title should be a one-liner not more than 5 words.
- Generate only relevant BRD based on the use case and domain.
- Generate a comprehensive list of requirements to meet the business needs of the use case given.
- If the solution involves technical needs, include technical best practices as part of the business requirements. If not do not include.
- Ensure that the requirements are unique and do not repeat similar content. Avoid generating repetitive requirements.

Consider these as an example and generate business requirements like this
Example 1: We would like to automate our customer relationship management system so that we can offer better customer services and improve customer response time by 70% in the next 6 months.
Example 2: Develop a centralized platform to enable employees to view, book, and manage meeting rooms seamlessly. This system should have the ability to display room availability in real-time, provide options to book resources for specific time slots, and allow modifications or cancellations of bookings. It must support varying levels of user access permissions to accommodate both regular employees and administrators.
Example 3: Create capabilities for patients to fill out and submit medical forms digitally prior to their visits. This functionality will help streamline the check-in process, reduce waiting times, and improve the accuracy of medical data collected, significantly enhancing patient intake efficiency`;
