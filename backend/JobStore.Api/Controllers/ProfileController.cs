using JobStore.Api.Infrastructure;
using JobStore.Application.Abstractions;
using JobStore.Application.DTOs;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace JobStore.Api.Controllers;

/// <summary>Profil du candidat connecte: informations, parcours, competences, langues, certifications et CV.</summary>
[Authorize(Roles = "Employee")]
public class ProfileController(IProfileService profileService) : ApiControllerBase
{
    [HttpGet]
    public IActionResult Get() => FromResult(profileService.GetEmployeeProfile(RequiredUserId));

    [HttpPut("personal-info")]
    public IActionResult UpdatePersonalInfo([FromBody] UpdatePersonalInfoRequest request) =>
        FromResult(profileService.UpdatePersonalInfo(RequiredUserId, request));

    [HttpPut("skills")]
    public IActionResult UpdateSkills([FromBody] UpdateSkillsRequest request) =>
        FromResult(profileService.UpdateSkills(RequiredUserId, request));

    // ---- Etudes -----------------------------------------------------------

    [HttpPost("educations")]
    public IActionResult AddEducation([FromBody] EducationRequest request) =>
        FromResult(profileService.AddEducation(RequiredUserId, request));

    [HttpPut("educations/{id:guid}")]
    public IActionResult UpdateEducation(Guid id, [FromBody] EducationRequest request) =>
        FromResult(profileService.UpdateEducation(RequiredUserId, id, request));

    [HttpDelete("educations/{id:guid}")]
    public IActionResult DeleteEducation(Guid id) =>
        FromResult(profileService.DeleteEducation(RequiredUserId, id));

    // ---- Experiences ------------------------------------------------------

    [HttpPost("experiences")]
    public IActionResult AddExperience([FromBody] ExperienceRequest request) =>
        FromResult(profileService.AddExperience(RequiredUserId, request));

    [HttpPut("experiences/{id:guid}")]
    public IActionResult UpdateExperience(Guid id, [FromBody] ExperienceRequest request) =>
        FromResult(profileService.UpdateExperience(RequiredUserId, id, request));

    [HttpDelete("experiences/{id:guid}")]
    public IActionResult DeleteExperience(Guid id) =>
        FromResult(profileService.DeleteExperience(RequiredUserId, id));

    // ---- Langues ----------------------------------------------------------

    [HttpPost("languages")]
    public IActionResult AddLanguage([FromBody] LanguageRequest request) =>
        FromResult(profileService.AddLanguage(RequiredUserId, request));

    [HttpPut("languages/{id:guid}")]
    public IActionResult UpdateLanguage(Guid id, [FromBody] LanguageRequest request) =>
        FromResult(profileService.UpdateLanguage(RequiredUserId, id, request));

    [HttpDelete("languages/{id:guid}")]
    public IActionResult DeleteLanguage(Guid id) =>
        FromResult(profileService.DeleteLanguage(RequiredUserId, id));

    // ---- Certifications ---------------------------------------------------

    [HttpPost("certifications")]
    public IActionResult AddCertification([FromBody] CertificationRequest request) =>
        FromResult(profileService.AddCertification(RequiredUserId, request));

    [HttpPut("certifications/{id:guid}")]
    public IActionResult UpdateCertification(Guid id, [FromBody] CertificationRequest request) =>
        FromResult(profileService.UpdateCertification(RequiredUserId, id, request));

    [HttpDelete("certifications/{id:guid}")]
    public IActionResult DeleteCertification(Guid id) =>
        FromResult(profileService.DeleteCertification(RequiredUserId, id));

    // ---- CV ---------------------------------------------------------------

    [HttpGet("resumes")]
    public IActionResult GetResumes() => FromResult(profileService.GetResumes(RequiredUserId));

    /// <summary>
    /// Televerse un CV (PDF, DOC, DOCX, TXT, 5 Mo maximum) et renvoie
    /// les donnees extraites automatiquement pour pre-remplir le formulaire de profil.
    /// </summary>
    [HttpPost("resumes")]
    [RequestSizeLimit(6 * 1024 * 1024)]
    public async Task<IActionResult> UploadResume(IFormFile file, CancellationToken cancellationToken)
    {
        if (file is null || file.Length == 0)
        {
            return BadRequest(new { message = "Aucun fichier recu." });
        }

        using var buffer = new MemoryStream();
        await file.CopyToAsync(buffer, cancellationToken);

        return FromResult(profileService.UploadResume(
            RequiredUserId,
            file.FileName,
            string.IsNullOrWhiteSpace(file.ContentType) ? "application/octet-stream" : file.ContentType,
            buffer.ToArray()));
    }

    [HttpPut("resumes/{id:guid}/default")]
    public IActionResult SetDefaultResume(Guid id) =>
        FromResult(profileService.SetDefaultResume(RequiredUserId, id));

    [HttpDelete("resumes/{id:guid}")]
    public IActionResult DeleteResume(Guid id) =>
        FromResult(profileService.DeleteResume(RequiredUserId, id));

    [HttpGet("resumes/{id:guid}/download")]
    public IActionResult DownloadResume(Guid id)
    {
        var result = profileService.DownloadResume(RequiredUserId, RequiredUserId, id);
        return result.Success
            ? File(result.Value.Content, result.Value.ContentType, result.Value.FileName)
            : StatusCode(result.StatusCode, new { message = result.Error });
    }
}
