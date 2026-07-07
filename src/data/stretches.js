export const STRETCH_MUSCLE_GROUPS = [
  'Full Body', 'Back', 'Chest', 'Shoulders', 'Core', 'Hips', 'Quads', 'Hamstrings', 'Calves', 'Neck',
]

// Maps exercise body_parts (from exercises table) to stretch muscle groups
export const BODY_PART_TO_STRETCH_GROUPS = {
  back: ['Back', 'Shoulders'],
  chest: ['Chest', 'Shoulders'],
  legs: ['Quads', 'Hamstrings', 'Hips', 'Calves'],
  shoulders: ['Shoulders', 'Chest', 'Back'],
  arms: ['Shoulders'],
  core: ['Core', 'Back', 'Hips'],
  cardio: ['Full Body', 'Calves', 'Hips', 'Quads'],
}

// Maps sore spot keys (from check-in parsing) to stretch muscle groups
export const SORE_SPOT_TO_MUSCLE_GROUP = {
  shoulder: 'Shoulders',
  hip: 'Hips',
  knee: 'Quads',
  lower_back: 'Back',
  hamstring: 'Hamstrings',
  calf: 'Calves',
}

export const STRETCHES = [
  // ─── DYNAMIC (pre-workout) ───────────────────────────────────────────────
  {
    id: 'dyn-leg-swing-fb',
    name: 'Leg Swings (Front-Back)',
    muscle_group: 'Hips',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Stand beside a wall and hold it for balance. Swing one leg forward as high as comfortable, then back. Keep your core braced and stay tall. Do 10–15 reps per leg.',
    why: 'The hip flexors and glutes shorten during sitting and need active range-of-motion work before loading. Swinging dynamically lubricates the hip joint with synovial fluid and teaches the nervous system the range it will need during squats and lunges.',
    common_mistakes: 'Leaning the torso forward or backward — keep your spine straight. Swinging too aggressively before the hip is warm.',
    contraindications: 'Hip replacement; acute hip flexor strain',
    duration_seconds: 30,
  },
  {
    id: 'dyn-leg-swing-side',
    name: 'Leg Swings (Side-to-Side)',
    muscle_group: 'Hips',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Hold a wall in front of you. Swing one leg across your body and then out to the side in a pendulum motion. Keep hips level. 10–15 reps per leg.',
    why: 'The hip adductors and abductors are often neglected in warm-ups. Lateral swings activate the glute medius and open the inner thigh, which reduces the risk of groin strains and knee cave during lateral movements.',
    common_mistakes: 'Rotating the pelvis — the movement should come from the hip joint, not the lower back.',
    contraindications: null,
    duration_seconds: 30,
  },
  {
    id: 'dyn-arm-circles',
    name: 'Arm Circles',
    muscle_group: 'Shoulders',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Stand with arms extended to the sides. Make small circles forward for 10 reps, then reverse. Gradually increase the circle size over the set.',
    why: 'The rotator cuff muscles are small and slow to warm up. Arm circles increase blood flow to the shoulder capsule and train the four rotator cuff muscles to stabilize through a full arc, which reduces impingement risk under load.',
    common_mistakes: 'Going too big too fast — start small and let the shoulder joint warm up progressively.',
    contraindications: 'Acute rotator cuff injury; recent shoulder surgery',
    duration_seconds: 30,
  },
  {
    id: 'dyn-arm-swings',
    name: 'Arm Swings (Cross-Body)',
    muscle_group: 'Chest',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Stand with feet shoulder-width apart. Swing both arms out to the sides and then cross them in front of your chest in an alternating pattern. Keep a slight bend in the elbows. 15–20 reps.',
    why: 'The pectorals and anterior deltoids pull the shoulders forward with prolonged sitting. Cross-body swings actively open the chest and train the scapular retractors, correcting the rounded posture that leads to shoulder impingement during pressing.',
    common_mistakes: 'Hunching forward — stay tall and let your chest open fully on each back swing.',
    contraindications: null,
    duration_seconds: 30,
  },
  {
    id: 'dyn-hip-circles',
    name: 'Hip Circles',
    muscle_group: 'Hips',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Stand with hands on hips and feet shoulder-width apart. Make large circles with your hips — 10 in each direction. Think of drawing a big oval with your pelvis.',
    why: 'Hip circles mobilize the ball-and-socket joint through its full available range, coating the cartilage with synovial fluid. This is especially important before squats and deadlifts, where restriction at the hip gets compensated by movement at the lumbar spine.',
    common_mistakes: 'Moving only the knees — the movement should come from the hips and lower back working together.',
    contraindications: null,
    duration_seconds: 30,
  },
  {
    id: 'dyn-torso-rotation',
    name: 'Torso Rotations',
    muscle_group: 'Core',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Stand with feet wider than shoulder-width, arms out at sides. Rotate your upper body left and right while keeping hips facing forward. Let your arms swing naturally. 10–15 reps each side.',
    why: 'The thoracic spine often becomes stiff and loses rotation, forcing the lumbar spine to compensate. Torso rotations restore T-spine mobility, which is critical for golf, throwing, and any rotational strength exercise — and protects the lower back.',
    common_mistakes: 'Rotating from the hips instead of the thoracic spine — focus on turning your chest and shoulders.',
    contraindications: 'Herniated disc; acute lower back pain',
    duration_seconds: 30,
  },
  {
    id: 'dyn-neck-rolls',
    name: 'Neck Rolls',
    muscle_group: 'Neck',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Drop your chin to your chest, then slowly roll your head to the right, back to center, then left. Do NOT roll fully backward — keep the movement in front of the vertical. 5 slow reps each way.',
    why: 'The scalenes and upper trapezius accumulate tension from screen posture and stress. Gentle dynamic neck movement restores cervical range-of-motion and reduces the headache-and-shoulder tension pattern that builds up from desk work.',
    common_mistakes: 'Rolling the head all the way back, which compresses cervical vertebrae. Keep movements slow and controlled.',
    contraindications: 'Cervical stenosis; neck injury; vertigo',
    duration_seconds: 30,
  },
  {
    id: 'dyn-ankle-rotations',
    name: 'Ankle Rotations',
    muscle_group: 'Calves',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Sit or stand and lift one foot slightly off the ground. Rotate the ankle slowly in large circles — 10 each direction per foot.',
    why: 'Ankle dorsiflexion range directly affects squat depth and running mechanics. Restricted ankles force the heel to rise or the knee to cave inward. Rotations warm up the tibiotalar joint and the surrounding ligaments before any lower-body loading.',
    common_mistakes: 'Moving the whole leg instead of just the ankle joint.',
    contraindications: 'Ankle sprain (acute phase)',
    duration_seconds: 20,
  },
  {
    id: 'dyn-inchworm',
    name: 'Inchworm',
    muscle_group: 'Hamstrings',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Stand tall, hinge at the hips and place your hands on the floor. Walk your hands out to a high plank position, hold for 1 second, then walk your feet up to your hands and stand. Repeat 6–8 times.',
    why: 'The inchworm is a full-chain warm-up — it dynamically lengthens the hamstrings, activates the core, and loads the shoulders in a stable plank. It teaches hip hinge mechanics under no external load, making it ideal prep for deadlifts and rows.',
    common_mistakes: 'Bending the knees as you walk your hands out — keep legs as straight as flexibility allows to get the hamstring lengthening.',
    contraindications: 'Wrist injury; shoulder impingement; sciatica',
    duration_seconds: 45,
  },
  {
    id: 'dyn-worlds-greatest',
    name: "World's Greatest Stretch",
    muscle_group: 'Full Body',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Step into a lunge. Place the same-side hand inside your front foot. Rotate that arm up toward the ceiling, following it with your eyes. Return, then hip hinge back to stretch the hamstring. 4–5 reps per side.',
    why: 'This stretch earns its name by hitting the hip flexor, thoracic spine, hamstring, and shoulder in one fluid sequence. It is arguably the single most efficient warm-up movement for any sport — it opens the hips and thoracic spine simultaneously, which most warm-ups never achieve.',
    common_mistakes: 'Rushing through it — this is a slow, deliberate movement. Take 3–4 seconds on each rotation.',
    contraindications: 'Acute hip flexor or groin strain',
    duration_seconds: 60,
  },
  {
    id: 'dyn-lateral-lunge',
    name: 'Lateral Lunge',
    muscle_group: 'Quads',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Stand with feet wide. Shift your weight to the right, bending the right knee and sitting back while the left leg stays straight. Push off and shift to the other side. 10 reps each side.',
    why: 'The adductors and inner quads rarely get loaded in the frontal plane during typical training. Lateral lunges warm up the groin and prepare the knee and hip stabilizers for multi-directional movement, reducing the risk of groin strains.',
    common_mistakes: 'Letting the knee cave inward — push the knee out over the toes on the working side.',
    contraindications: 'Acute knee injury; groin strain',
    duration_seconds: 40,
  },
  {
    id: 'dyn-cat-cow',
    name: 'Cat-Cow',
    muscle_group: 'Back',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'On hands and knees. Inhale and drop your belly down, lifting your head and tailbone (Cow). Exhale and arch your back up, tucking chin and pelvis (Cat). Move fluidly between the two for 8–10 breaths.',
    why: 'The spinal erectors and multifidus need to move before they stabilize under load. Cat-cow segments the spine and re-establishes the connection between breath and lumbar position — a pattern that protects the discs during deadlifts and squats.',
    common_mistakes: 'Moving too fast or only in the lumbar spine — work through the entire spine from neck to tailbone.',
    contraindications: 'Wrist pain (use fists or forearms); acute back spasm',
    duration_seconds: 40,
  },
  {
    id: 'dyn-hip-flexor-lunge',
    name: 'Dynamic Hip Flexor Lunge',
    muscle_group: 'Hips',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'Step into a lunge, lower the back knee to the ground, then drive the back hip forward to feel a stretch. Return to standing and repeat. 8–10 reps per side.',
    why: 'The psoas and iliacus (hip flexors) shorten dramatically from sitting. A tight psoas anteriorly tilts the pelvis, compresses the lumbar spine, and limits glute activation. Dynamically opening this before squats and deadlifts restores proper pelvic position.',
    common_mistakes: 'Arching the lower back excessively — brace your core and tuck the pelvis slightly to deepen the hip flexor stretch.',
    contraindications: 'Acute hip flexor strain; knee pain on the floor',
    duration_seconds: 45,
  },
  {
    id: 'dyn-high-knees-slow',
    name: 'Slow High Knees',
    muscle_group: 'Quads',
    stretch_type: 'dynamic',
    ideal_timing: 'pre_workout',
    how_to: 'March in place, driving each knee up toward your chest in a controlled, exaggerated motion. Alternate legs slowly — this is about mobility, not cardio. 15–20 reps per leg.',
    why: 'Slow high knees activate the hip flexors concentrically while the supporting leg\'s glute and calf work isometrically for balance. This primes the neuromuscular connection for single-leg stability demands in lunges, step-ups, and running.',
    common_mistakes: 'Hunching forward — stay tall and drive the knee up with your hip flexors.',
    contraindications: null,
    duration_seconds: 30,
  },

  // ─── STATIC (post-workout) ───────────────────────────────────────────────
  {
    id: 'sta-quad-standing',
    name: 'Standing Quad Stretch',
    muscle_group: 'Quads',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Stand on one leg. Bend the other knee and grasp the ankle behind you. Pull the heel toward your glute. Keep knees together and stand tall. Hold 30–45 seconds per side.',
    why: 'The quadriceps (especially the rectus femoris) cross both the hip and knee and become chronically shortened from squatting and lunging under load. Prolonged tightness tilts the pelvis forward and compresses the lumbar spine over time.',
    common_mistakes: 'Leaning forward or letting the knee flare out to the side — keep thighs parallel and squeeze the glute of the stretching leg.',
    contraindications: 'Knee injury; anterior knee pain',
    duration_seconds: 40,
  },
  {
    id: 'sta-hamstring-seated',
    name: 'Seated Hamstring Stretch',
    muscle_group: 'Hamstrings',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Sit on the floor with legs extended. Hinge at the hips and reach toward your toes — go until you feel a pull in the back of your thighs, not your lower back. Hold 45–60 seconds.',
    why: 'Tight hamstrings are one of the most common contributors to lower back pain — they pull the pelvis into a posterior tilt, flattening the lumbar curve. Lengthening them after heavy leg work reduces next-day stiffness and protects the lumbar spine.',
    common_mistakes: 'Rounding the back to reach further — the stretch must come from tilting the pelvis, not rounding the spine.',
    contraindications: 'Sciatica (can aggravate); herniated disc',
    duration_seconds: 50,
  },
  {
    id: 'sta-pigeon-pose',
    name: 'Pigeon Pose',
    muscle_group: 'Hips',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'From a plank, bring one knee to your same-side wrist and let the shin angle across. Lower the back leg straight. Sink your hips down and walk your hands forward. Hold 45–60 seconds per side.',
    why: 'Pigeon directly targets the piriformis and deep external hip rotators — the muscles most responsible for hip tightness in athletes. Chronic piriformis tightness can compress the sciatic nerve, causing referred pain down the leg.',
    common_mistakes: 'Letting the front hip roll up off the floor — press it down gently to get equal pressure through both hips.',
    contraindications: 'Knee injury; acute hip impingement; hip replacement',
    duration_seconds: 60,
  },
  {
    id: 'sta-figure-4',
    name: 'Figure-4 Hip Stretch',
    muscle_group: 'Hips',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Lie on your back. Cross one ankle over the opposite thigh just above the knee. Flex that foot. Pull the uncrossed leg toward your chest until you feel the stretch in the crossed-leg glute. Hold 45 seconds.',
    why: 'The figure-4 is the supine version of pigeon — it stretches the piriformis and glute medius without requiring hip flexion range. It is a safer option than pigeon for anyone with knee sensitivity and is equally effective for post-squat hip recovery.',
    common_mistakes: 'Not flexing the foot of the crossed leg — this protects the knee joint during the stretch.',
    contraindications: 'Acute hip injury; recent hip surgery',
    duration_seconds: 45,
  },
  {
    id: 'sta-childs-pose',
    name: "Child's Pose",
    muscle_group: 'Back',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Kneel and sit back toward your heels. Walk your hands forward and lower your forehead to the floor. Arms can be extended or resting alongside your body. Breathe deeply and hold 45–60 seconds.',
    why: 'Child\'s pose decompresses the lumbar and thoracic spine by creating long-axis traction and passive spinal flexion. After deadlifts and rows that load the spine in extension, this countermovement reduces disc pressure and calms the nervous system.',
    common_mistakes: 'Holding tension in the shoulders — actively try to let the upper back sink toward the floor with each exhale.',
    contraindications: 'Knee injury; ankle mobility limitations',
    duration_seconds: 50,
  },
  {
    id: 'sta-chest-doorway',
    name: 'Doorway Chest Stretch',
    muscle_group: 'Chest',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Place your forearms on a doorframe at 90-degree elbow bend. Step one foot forward until you feel your chest and front shoulders open. Hold 30–45 seconds. Try high, mid, and low arm positions.',
    why: 'Heavy pressing (bench press, push-ups) shortens the pectorals and internal rotators, pulling the shoulder forward into a rounded position. Failing to stretch them leads to the hunched posture and shoulder impingement seen in long-term lifters.',
    common_mistakes: 'Leaning aggressively — let gravity and the door do the work. Pushing too hard can overstress the shoulder capsule.',
    contraindications: 'Shoulder instability; recent pectoral tear; AC joint injury',
    duration_seconds: 35,
  },
  {
    id: 'sta-shoulder-cross-body',
    name: 'Cross-Body Shoulder Stretch',
    muscle_group: 'Shoulders',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Pull one arm across your chest and hold it in place with the other arm just above the elbow. Don\'t grab the elbow joint itself. Hold 30 seconds per side.',
    why: 'The posterior deltoid and rotator cuff accumulate tightness from pull-based exercises. This stretch lengthens the posterior capsule and rear deltoid, which restores the shoulder\'s natural resting position and prevents the internal rotation pattern that causes impingement.',
    common_mistakes: 'Letting the shoulder of the stretched arm hike up — keep it pressed down away from your ear.',
    contraindications: null,
    duration_seconds: 30,
  },
  {
    id: 'sta-calf-wall',
    name: 'Standing Calf Stretch',
    muscle_group: 'Calves',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Stand facing a wall, hands on it. Step one foot back and press the heel firmly into the floor. Keep the back leg straight for gastrocnemius, or bend it slightly for soleus. Hold 30–45 seconds each.',
    why: 'The gastrocnemius and soleus shorten significantly after running and jump training. Chronically tight calves restrict ankle dorsiflexion, which forces the knee to cave inward during squats and causes plantar fasciitis and Achilles tendon issues long-term.',
    common_mistakes: 'Letting the heel lift — the stretch comes specifically from pressing the heel down. Foot should point straight ahead.',
    contraindications: 'Achilles tendon injury (consult a physio first)',
    duration_seconds: 35,
  },
  {
    id: 'sta-spinal-twist-seated',
    name: 'Seated Spinal Twist',
    muscle_group: 'Back',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Sit on the floor with legs extended. Bend one knee, cross it over the other leg. Rotate toward the bent knee and place your opposite elbow outside the bent knee. Hold 30 seconds per side.',
    why: 'The thoracic rotators and quadratus lumborum get compressed during heavy bilateral lifts. This twist creates passive rotation through the spine, which releases the paraspinal muscles, improves spinal articulation, and can reduce the "locked up" feeling after a heavy back day.',
    common_mistakes: 'Collapsing the spine — sit tall and grow taller with each inhale before rotating further on each exhale.',
    contraindications: 'Herniated disc; spinal stenosis',
    duration_seconds: 30,
  },
  {
    id: 'sta-neck-side',
    name: 'Neck Side Stretch',
    muscle_group: 'Neck',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Sit or stand tall. Tilt your right ear toward your right shoulder. For a deeper stretch, gently rest your right hand on the left side of your head (no pulling). Hold 20–30 seconds per side.',
    why: 'The upper trapezius and sternocleidomastoid are major stress-holding muscles. They chronically elevate the shoulder and tilt the head, compressing the cervical facet joints over time. Lengthening them daily is one of the most effective ways to prevent tension headaches.',
    common_mistakes: 'Pulling the head with force — use only the weight of your hand or no hand at all. The neck muscles are small and can strain easily.',
    contraindications: 'Cervical disc injury; nerve pain radiating into the arm',
    duration_seconds: 25,
  },
  {
    id: 'sta-cobra',
    name: 'Cobra Pose',
    muscle_group: 'Core',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Lie face down, hands under your shoulders. Press up through your palms and lift your chest, keeping your hips on the floor. Elbows can stay bent. Hold 20–30 seconds.',
    why: 'The rectus abdominis and hip flexors shorten significantly from crunches, cycling, and desk posture. Cobra creates extension through the anterior chain, counteracting this pattern and relieving the disc compression that builds from prolonged flexed postures.',
    common_mistakes: 'Cranking your head back or squeezing the glutes — keep the neck in line with the spine and let the lower back extend passively.',
    contraindications: 'Herniated lumbar disc; pregnancy; wrist injury',
    duration_seconds: 25,
  },
  {
    id: 'sta-hip-flexor-kneeling',
    name: 'Kneeling Hip Flexor Stretch',
    muscle_group: 'Hips',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Kneel on one knee, opposite foot forward (lunge position). Tuck your pelvis under and drive the back hip slightly forward until you feel a stretch in the front of the back hip. Hold 40–60 seconds per side.',
    why: 'The hip flexors are the most chronically shortened muscle group in sedentary adults. When they stay tight after training, they pull the lumbar spine into excessive extension, contributing to lower back pain and impaired glute activation in the next session.',
    common_mistakes: 'Arching the lower back — the pelvic tuck is critical. Without it, you stretch the lumbar spine instead of the hip flexor.',
    contraindications: 'Knee pain on the floor (use a pad); hip flexor strain',
    duration_seconds: 50,
  },
  {
    id: 'sta-overhead-lat',
    name: 'Overhead Lat Stretch',
    muscle_group: 'Back',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Raise one arm overhead. Lean to the opposite side and grab your raised wrist with the other hand for a gentle pull. Hold 25–30 seconds per side.',
    why: 'The latissimus dorsi is the broadest muscle in the back and runs from the humerus to the pelvis. Heavy pulling exercises shorten it considerably, and a tight lat internally rotates the shoulder and depresses it — contributing to shoulder impingement and limited overhead range.',
    common_mistakes: 'Leaning forward instead of directly to the side — keep the movement purely lateral.',
    contraindications: 'Shoulder impingement; rotator cuff injury',
    duration_seconds: 28,
  },
  {
    id: 'sta-butterfly',
    name: 'Butterfly Stretch',
    muscle_group: 'Hips',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Sit on the floor, bring the soles of your feet together in front of you. Sit tall and let your knees drop toward the floor. For more stretch, lean your torso slightly forward from the hips. Hold 45 seconds.',
    why: 'The adductors (inner thigh muscles) work hard during squats, lunges, and lateral movements but are rarely stretched. Chronic adductor tightness limits hip abduction range, forcing the knees to cave inward under load and creating a compensatory stress pattern up the kinetic chain.',
    common_mistakes: 'Rounding the back to get lower — hinge from the hips, not the waist. Pressing the knees down with your hands creates joint stress.',
    contraindications: 'Groin injury; medial knee injury',
    duration_seconds: 45,
  },
  {
    id: 'sta-supine-twist',
    name: 'Supine Spinal Twist',
    muscle_group: 'Back',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Lie on your back. Pull one knee to your chest, then cross it over your body while keeping both shoulders flat on the floor. Extend the top arm out to the side. Breathe deeply. Hold 45 seconds per side.',
    why: 'The supine twist is a passive version of the seated twist — gravity does the work, making it ideal for post-workout or pre-sleep recovery. It decompresses the lumbar facet joints and stretches the piriformis and quadratus lumborum simultaneously.',
    common_mistakes: 'Letting the opposite shoulder lift — use your hand to gently hold the crossed knee down while focusing on keeping the far shoulder grounded.',
    contraindications: 'Herniated disc (caution); acute sciatica',
    duration_seconds: 45,
  },
  {
    id: 'sta-forward-fold',
    name: 'Standing Forward Fold',
    muscle_group: 'Hamstrings',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Stand with feet hip-width apart. Hinge at the hips and let your torso hang down. Bend your knees slightly if needed. Let your head and neck relax completely. Hold 45–60 seconds, breathing into the stretch.',
    why: 'The standing forward fold inverts the spine and uses the weight of the torso to create traction through the lumbar and thoracic vertebrae. It also decompresses the hamstring attachment at the sit bones — the spot that often stays tight long after seated stretches stop working.',
    common_mistakes: 'Rounding the back from the waist — initiate the fold from the hip hinge, not by collapsing the spine.',
    contraindications: 'Vertigo; eye pressure issues; acute lower back pain',
    duration_seconds: 50,
  },
  {
    id: 'sta-thread-needle',
    name: 'Thread the Needle',
    muscle_group: 'Shoulders',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'On hands and knees. Slide one arm under your body along the floor, rotating your upper back until your shoulder and ear rest on the ground. Hold 30 seconds per side.',
    why: 'Thread the Needle targets the posterior shoulder capsule and thoracic rotators in a way that standing stretches cannot — the ground provides resistance for a passive, gravity-assisted release. It is particularly effective for relieving the tension that builds between the shoulder blades after heavy rows.',
    common_mistakes: 'Pressing down on the arm with your body weight — rest it gently; the rotation is what does the work.',
    contraindications: 'Shoulder injury; neck issues',
    duration_seconds: 30,
  },
  {
    id: 'sta-sleeper-stretch',
    name: 'Sleeper Stretch',
    muscle_group: 'Shoulders',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Lie on one side with the bottom arm extended out, shoulder at 90 degrees. With your top hand, gently press the bottom forearm down toward the floor, rotating the shoulder internally. Stop at the point of pull. Hold 30 seconds.',
    why: 'The posterior capsule of the shoulder is the most commonly tightened structure in overhead athletes and heavy lifters. When the back of the capsule is tight, it pushes the humeral head forward and upward, creating the internal impingement that leads to rotator cuff tears over time.',
    common_mistakes: 'Pressing too aggressively — this is a very effective stretch for the posterior capsule; be conservative with force.',
    contraindications: 'Shoulder impingement (may aggravate); rotator cuff injury (consult physio)',
    duration_seconds: 30,
  },
  {
    id: 'sta-it-band',
    name: 'Standing IT Band Stretch',
    muscle_group: 'Quads',
    stretch_type: 'static',
    ideal_timing: 'post_workout_or_bed',
    how_to: 'Stand and cross one foot behind the other. Lean away from the front leg while raising the same-side arm overhead, creating a lateral lean. Feel the stretch along the outside of your thigh. Hold 30 seconds per side.',
    why: 'The iliotibial band is a thick band of connective tissue that can become chronically irritated from running and cycling, causing lateral knee pain (IT band syndrome). It is not actually a muscle and cannot be stretched in the traditional sense — this position reduces tension on it by altering hip position.',
    common_mistakes: 'The IT band is not very elastic — do not force this stretch. A gentle lean is enough.',
    contraindications: 'Knee instability; hip bursitis',
    duration_seconds: 30,
  },

  // ─── BOTH (work for warmup or cooldown) ──────────────────────────────────
  {
    id: 'both-thoracic-rotation',
    name: 'Thoracic Rotation (Seated)',
    muscle_group: 'Back',
    stretch_type: 'both',
    ideal_timing: 'anytime',
    how_to: 'Sit cross-legged or in a chair. Place both hands behind your head. Rotate your upper body to one side as far as comfortable, pause, then return. 10 slow reps each side as dynamic; hold 20 seconds as static.',
    why: 'The thoracic spine is designed for rotation but becomes rigid from desk posture and bilateral lifting. Loss of T-spine rotation forces the lumbar spine and cervical spine to compensate with excessive rotation, contributing to both neck pain and lower back injury.',
    common_mistakes: 'Rotating from the lower back or hips — the movement should come entirely from the thoracic spine (mid-back).',
    contraindications: 'Spinal stenosis; acute mid-back pain',
    duration_seconds: 40,
  },
  {
    id: 'both-90-90-hip',
    name: '90/90 Hip Stretch',
    muscle_group: 'Hips',
    stretch_type: 'both',
    ideal_timing: 'anytime',
    how_to: 'Sit on the floor with both legs bent at 90 degrees — front shin perpendicular to your body, back shin parallel behind you. Sit tall. Hold as a static stretch (45s per side) or rotate between sides for dynamic use.',
    why: 'The 90/90 simultaneously targets hip internal rotation (back hip) and external rotation (front hip) — two ranges that standard hip stretches always address separately. Most people have a strong imbalance between these two, and this position exposes and corrects it efficiently.',
    common_mistakes: 'Collapsing onto the side — try to keep both hips in contact with the floor before you lean forward.',
    contraindications: 'Acute knee pain; hip impingement',
    duration_seconds: 45,
  },
]

export const STRETCH_BY_ID = Object.fromEntries(STRETCHES.map(s => [s.id, s]))
export const STRETCH_BY_GROUP = STRETCH_MUSCLE_GROUPS.reduce((acc, g) => {
  acc[g] = STRETCHES.filter(s => s.muscle_group === g)
  return acc
}, {})

export function getRecommendedStretches(bodyParts = [], soreSpots = []) {
  const targetGroups = new Set(['Full Body'])

  // Map workout body_parts to stretch muscle groups
  for (const bp of bodyParts) {
    const groups = BODY_PART_TO_STRETCH_GROUPS[bp.toLowerCase()] || []
    groups.forEach(g => targetGroups.add(g))
  }

  // Add sore spot groups
  for (const spot of soreSpots) {
    const group = SORE_SPOT_TO_MUSCLE_GROUP[spot]
    if (group) targetGroups.add(group)
    else targetGroups.add(spot)
  }

  const isRestDay = bodyParts.length === 0

  if (isRestDay) {
    // Full-body mobility flow for rest days
    targetGroups.add('Back')
    targetGroups.add('Hips')
    targetGroups.add('Shoulders')
    targetGroups.add('Hamstrings')
  }

  const groups = Array.from(targetGroups)

  const dynamic = STRETCHES.filter(s =>
    (s.stretch_type === 'dynamic' || s.stretch_type === 'both') &&
    groups.includes(s.muscle_group)
  ).slice(0, isRestDay ? 5 : 6)

  const staticStretches = STRETCHES.filter(s =>
    (s.stretch_type === 'static' || s.stretch_type === 'both') &&
    groups.includes(s.muscle_group)
  ).slice(0, isRestDay ? 8 : 10)

  return { dynamic, static: staticStretches, isRestDay, targetGroups: groups }
}

export function getTimingLabel(ideal_timing) {
  if (ideal_timing === 'pre_workout') return 'Do BEFORE workout — needs blood moving first.'
  if (ideal_timing === 'post_workout_or_bed') return 'Do AFTER workout when muscles are warm, or before sleep.'
  return 'Works anytime — pre or post workout.'
}
