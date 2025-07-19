import { supabase } from "@/integrations/supabase/client";

type JazzHRRole = "super_admin" | "recruiting_admin" | "recruiting_user" | "interviewer" | "super_user" | "developer" | "external_recruiter";

// Sample JazzHR users for testing
const testJazzHRUsers = [
  {
    jazzhr_user_id: "jhr_001",
    email: "bart@startupaccelerator.nl",
    name: "Bart van den Akker",
    jazzhr_role: "super_admin" as JazzHRRole,
    permissions: {
      can_manage_users: true,
      can_view_all_jobs: true,
      can_edit_jobs: true,
      can_view_reports: true
    },
    assigned_jobs: ["*"], // * means all jobs
    is_active: true
  },
  {
    jazzhr_user_id: "jhr_002", 
    email: "recruiter@startupaccelerator.nl",
    name: "Sarah Johnson",
    jazzhr_role: "recruiting_admin" as JazzHRRole,
    permissions: {
      can_manage_candidates: true,
      can_view_jobs: true,
      can_edit_jobs: true
    },
    assigned_jobs: ["job_001", "job_002"],
    is_active: true
  },
  {
    jazzhr_user_id: "jhr_003",
    email: "hiring@startupaccelerator.nl", 
    name: "Mike Chen",
    jazzhr_role: "recruiting_user" as JazzHRRole,
    permissions: {
      can_view_candidates: true,
      can_add_notes: true
    },
    assigned_jobs: ["job_001"],
    is_active: true
  },
  {
    jazzhr_user_id: "jhr_004",
    email: "interviewer@startupaccelerator.nl",
    name: "Emma Wilson", 
    jazzhr_role: "interviewer" as JazzHRRole,
    permissions: {
      can_view_assigned_candidates: true,
      can_complete_interviews: true
    },
    assigned_jobs: ["job_001"],
    is_active: true
  }
];

export async function addTestJazzHRUsers() {
  try {
    console.log('Adding test JazzHR users...');
    
    for (const user of testJazzHRUsers) {
      const { data, error } = await supabase
        .from('jazzhr_users')
        .upsert(user, { 
          onConflict: 'jazzhr_user_id'
        });
      
      if (error) {
        console.error(`Failed to add user ${user.email}:`, error);
      } else {
        console.log(`Successfully added user: ${user.email} (${user.jazzhr_role})`);
      }
    }
    
    console.log('✅ Test JazzHR users have been added successfully!');
    console.log('You can now register with these emails:');
    testJazzHRUsers.forEach(user => {
      console.log(`- ${user.email} (${user.jazzhr_role})`);
    });
    
    return { success: true, usersAdded: testJazzHRUsers.length };
  } catch (error) {
    console.error('Error adding test users:', error);
    return { success: false, error: error.message };
  }
}

// For browser console usage
(window as any).addTestJazzHRUsers = addTestJazzHRUsers;